import { describe, expect, it } from "vitest";

import {
  SiapsParseError,
  buildScopeSignature,
  classifyC3,
  competencyToIso,
  decimalPtBr,
  generatedAtToIso,
  parseSiapsMatrix,
  practiceWeight,
  recomposeC3,
  strictInteger,
  type Matriz,
} from "@/lib/siaps/parse";

/**
 * Fixture com a estrutura real do relatório do SIAPS e valores reais de
 * JUN/2026 do município 250400. O relatório é agregado por equipe: não
 * contém dado pessoal.
 */
const CABECALHO = [
  "CNES", "ESTABELECIMENTO", "TIPO DO ESTABELECIMENTO", "INE",
  "NOME DA EQUIPE", "SIGLA DA EQUIPE",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
  "SOMATÓRIO DAS BOAS PRÁTICAS PONTUADAS",
  "Nº TOTAL DE GESTANTES E PUÉRPERAS VINCULADAS",
  "RAZÃO ENTRE O NUMERADOR E DENOMINADOR",
];

const LEONCIO = [
  "6267939", "UBS MARIA DE LOURDES LEONCIO", "CENTRO DE SAUDE/UNIDADE BASICA",
  "0002183307", "MARIA DE L. LEONCIO - EQ. III", "eSF",
  19, 10, 12, 11, 4, 13, 11, 1, 4, 2, 9, 883, 21, "42,05",
];
const MALVINAS = [
  "5053285", "UBS MALVINAS II", "CENTRO DE SAUDE/UNIDADE BASICA",
  "0002437708", "MALVINAS II - EQ II", "eSF",
  7, 4, 4, 4, 5, 7, 6, 3, 4, 2, 1, 430, 10, "43,00",
];
const POLICLINICA = [
  "2362236", "POLICLINICA DA PALMEIRA", "CENTRO DE SAUDE/UNIDADE BASICA",
  "0002256738", "EAP - PALMEIRA", "eAP",
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "0,00",
];

function relatorio(
  linhas: Matriz = [LEONCIO, MALVINAS, POLICLINICA],
  overrides: { competencia?: string; indicador?: string; municipio?: string; titulo?: string } = {},
): Matriz {
  return [
    ["Ministério da Saúde - MS"],
    ["Secretaria de Atenção Primária à Saúde - Saps"],
    ["Sistema de Informação para a Atenção Primária à Saúde – Siaps"],
    ["Dado gerado em: 04 de setembro de 2026 - 19:20h"],
    [overrides.titulo ?? "Relatório Qualidade - Visão por Competência"],
    ["Dado Preliminar"],
    [""],
    ["Dados sociodemográficos:"],
    ["UF: PB"],
    [`Município: ${overrides.municipio ?? "250400 / CAMPINA GRANDE"}`],
    [""],
    ["Filtro:"],
    [`Indicador: ${overrides.indicador ?? "Cuidado na Gestação e Puerpério"}`],
    [`Competência selecionada: ${overrides.competencia ?? "JUN/26"}`],
    ["Condição das Equipes: Considera apenas equipes homologadas"],
    ["Tipo de Equipe: eAP, eSF"],
    [""],
    CABECALHO,
    ...linhas,
    [""],
    ["Fonte: Sistema de Informação para a Atenção Primária à Saúde - SIAPS"],
  ];
}

describe("conversões do layout SIAPS", () => {
  it("lê competência abreviada", () => {
    expect(competencyToIso("JUN/26")).toBe("2026-06-01");
    expect(competencyToIso("JAN/26")).toBe("2026-01-01");
    expect(competencyToIso("XXX/26")).toBeNull();
  });

  it("lê a data de geração por extenso", () => {
    expect(generatedAtToIso(" 04 de setembro de 2026 - 19:20h")).toBe(
      "2026-09-04T19:20:00.000Z",
    );
  });

  it("lê decimal com vírgula", () => {
    expect(decimalPtBr("42,05")).toBe(42.05);
    expect(decimalPtBr("0,00")).toBe(0);
  });

  // O contrato proíbe transformar valor inválido em zero.
  it("recusa número malformado em vez de truncar", () => {
    expect(strictInteger("12abc")).toBeNull();
    expect(strictInteger("")).toBeNull();
    expect(strictInteger(null)).toBeNull();
    expect(strictInteger("21")).toBe(21);
  });

  it("normaliza a assinatura de escopo para comparar competências", () => {
    expect(buildScopeSignature("eAP, eSF", "Considera apenas equipes homologadas")).toBe(
      buildScopeSignature("eSF, eAP", "considera apenas equipes homologadas"),
    );
    expect(buildScopeSignature("eSF", "x")).not.toBe(
      buildScopeSignature("eAP, eSF", "x"),
    );
  });
});

describe("reconhecimento obrigatório da fonte", () => {
  it("extrai os metadados do relatório", () => {
    const { metadata } = parseSiapsMatrix(relatorio());
    expect(metadata.competency).toBe("2026-06-01");
    expect(metadata.municipalityIbge).toBe("250400");
    expect(metadata.uf).toBe("PB");
    expect(metadata.sourceStatus).toBe("preliminar");
    expect(metadata.teamTypeFilter).toBe("eAP, eSF");
    expect(metadata.generatedAt).toBe("2026-09-04T19:20:00.000Z");
  });

  it("recusa Visão por Equipe como fonte de ingestão", () => {
    expect(() =>
      parseSiapsMatrix(relatorio(undefined, { titulo: "Relatório Qualidade - Visão por Equipe" })),
    ).toThrow(SiapsParseError);
  });

  it("recusa indicador diferente do C3", () => {
    expect(() =>
      parseSiapsMatrix(relatorio(undefined, { indicador: "Cuidado da Pessoa com Diabetes" })),
    ).toThrow(SiapsParseError);
  });

  it("recusa outro município", () => {
    expect(() =>
      parseSiapsMatrix(relatorio(undefined, { municipio: "250750 / OUTRO" })),
    ).toThrow(SiapsParseError);
  });

  // A série oficial da V3 começa em JAN/2026.
  it("recusa competência anterior à série oficial", () => {
    expect(() =>
      parseSiapsMatrix(relatorio(undefined, { competencia: "DEZ/25" })),
    ).toThrow(SiapsParseError);
  });
});

describe("leitura das linhas", () => {
  it("lê as três equipes e para no rodapé", () => {
    const { rows } = parseSiapsMatrix(relatorio());
    expect(rows).toHaveLength(3);
    expect(rows.some((r) => r.cnes.startsWith("Fonte"))).toBe(false);
  });

  it("preserva zeros à esquerda do INE", () => {
    const { rows } = parseSiapsMatrix(relatorio());
    expect(rows[0].ine).toBe("0002183307");
    expect(rows[0].ine).toHaveLength(10);
  });

  it("aceita denominador zero como informação legítima", () => {
    const { rows } = parseSiapsMatrix(relatorio());
    const policlinica = rows.find((r) => r.ine === "0002256738");
    expect(policlinica?.denominator).toBe(0);
    expect(policlinica?.pointsTotal).toBe(0);
  });

  it("recusa INE que perdeu os zeros à esquerda", () => {
    const quebrado = [...LEONCIO];
    quebrado[3] = "2183307";
    const { rows, issues } = parseSiapsMatrix(relatorio([quebrado, MALVINAS]));
    expect(rows).toHaveLength(1);
    expect(issues.some((i) => i.message.includes("INE"))).toBe(true);
  });

  it("recusa INE duplicado na mesma competência", () => {
    const { rows, issues } = parseSiapsMatrix(relatorio([LEONCIO, [...LEONCIO]]));
    expect(rows).toHaveLength(1);
    expect(issues.some((i) => i.message.includes("já aparece"))).toBe(true);
  });

  it("recusa a linha quando uma boa prática não é numérica", () => {
    const quebrado = [...LEONCIO];
    quebrado[6] = "12abc";
    const { rows, issues } = parseSiapsMatrix(relatorio([quebrado, MALVINAS]));
    expect(rows).toHaveLength(1);
    expect(issues.some((i) => i.message.includes("boa prática A"))).toBe(true);
  });
});

describe("checksum do indicador", () => {
  it("os valores reais do SIAPS fecham a soma ponderada", () => {
    const { checksumFailures } = parseSiapsMatrix(relatorio());
    expect(checksumFailures).toBe(0);
  });

  it("reproduz a fórmula oficial 10*A + 9*(B..K)", () => {
    const { rows } = parseSiapsMatrix(relatorio());
    const leoncio = rows[0];
    const soma = leoncio.practices.reduce(
      (total, value, index) => total + value * practiceWeight(index),
      0,
    );
    expect(soma).toBe(883);
    expect(soma / leoncio.denominator).toBeCloseTo(42.05, 2);
  });

  it("os pesos somam 100", () => {
    const total = Array.from({ length: 11 }, (_, i) => practiceWeight(i)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(total).toBe(100);
  });

  it("detecta pontuação adulterada", () => {
    const adulterado = [...LEONCIO];
    adulterado[17] = 900;
    const { checksumFailures } = parseSiapsMatrix(relatorio([adulterado]));
    expect(checksumFailures).toBe(1);
  });
});

describe("recomposição e classificação", () => {
  // (883+430)/(21+10) = 42,35… — a média simples daria 42,525.
  it("recompõe por SUM(pontos)/SUM(denominador)", () => {
    const resultado = recomposeC3([
      { pointsTotal: 883, denominator: 21 },
      { pointsTotal: 430, denominator: 10 },
    ]);
    expect(resultado).toBeCloseTo((883 + 430) / (21 + 10), 6);
  });

  it("não é a média simples dos percentuais das equipes", () => {
    const recomposto = recomposeC3([
      { pointsTotal: 883, denominator: 21 },
      { pointsTotal: 430, denominator: 10 },
    ])!;
    const mediaSimples = (883 / 21 + 430 / 10) / 2;
    expect(recomposto).not.toBeCloseTo(mediaSimples, 6);
  });

  it("denominador total zero devolve nulo, não zero", () => {
    expect(recomposeC3([{ pointsTotal: 0, denominator: 0 }])).toBeNull();
  });

  it.each([
    [100, "Ótimo"],
    [75.01, "Ótimo"],
    [75, "Bom"],
    [50.01, "Bom"],
    [50, "Suficiente"],
    [42.05, "Suficiente"],
    [25.01, "Suficiente"],
    [25, "Regular"],
    [0, "Regular"],
  ])("classifica %s como %s", (valor, esperado) => {
    expect(classifyC3(valor)).toBe(esperado);
  });

  // Sem população elegível não é desempenho ruim.
  it("sem denominador não há classificação", () => {
    expect(classifyC3(null)).toBeNull();
  });
});
