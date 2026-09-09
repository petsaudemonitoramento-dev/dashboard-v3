import { describe, expect, it } from "vitest";

import { parseCsv, detectDelimiter } from "@/lib/professional/pec/csv";
import { recognizeColumns, normalizeHeader } from "@/lib/professional/pec/columns";
import {
  PecParseError,
  parseDate,
  parsePecMatrix,
  parseRisk,
  parseStrictInteger,
  normalizeName,
  type Matriz,
} from "@/lib/professional/pec/parse";

describe("reconhecimento de cabeçalho", () => {
  it("normaliza acento, caixa e pontuação", () => {
    expect(normalizeHeader("Data de Nascimento")).toBe("data de nascimento");
    expect(normalizeHeader("  CLASSIFICAÇÃO  DE   RISCO ")).toBe(
      "classificacao de risco",
    );
  });

  it("reconhece variações comuns do PEC", () => {
    const { map, recognized } = recognizeColumns([
      "Nome da Gestante",
      "Data de Nascimento",
      "DUM",
      "DPP",
      "Risco Gestacional",
      "Nº Consultas",
    ]);
    expect(map.displayName).toBe(0);
    expect(map.birthDate).toBe(1);
    expect(map.prenatalStartDate).toBe(2);
    expect(map.dueDate).toBe(3);
    expect(map.riskLevel).toBe(4);
    expect(map.prenatalVisits).toBe(5);
    expect(recognized).toHaveLength(6);
  });

  it("não atribui o mesmo campo a duas colunas", () => {
    const { map, unmapped } = recognizeColumns(["Nome", "Nome Social"]);
    expect(map.displayName).toBe(0);
    expect(unmapped).toContain("Nome Social");
  });

  it("lista cabeçalhos desconhecidos em vez de descartá-los em silêncio", () => {
    const { unmapped } = recognizeColumns(["Nome", "Coluna Estranha"]);
    expect(unmapped).toEqual(["Coluna Estranha"]);
  });
});

describe("validação estrita de valores", () => {
  // O contrato proíbe explicitamente aceitar parseInt("12abc").
  it("recusa número malformado em vez de truncar", () => {
    expect(parseStrictInteger("12abc")).toEqual({ error: "número inválido" });
    expect(parseStrictInteger("7")).toEqual({ value: 7 });
    expect(parseStrictInteger("")).toEqual({ value: null });
    expect(parseStrictInteger(null)).toEqual({ value: null });
  });

  it("não transforma vazio em zero", () => {
    const resultado = parseStrictInteger("");
    expect(resultado).toEqual({ value: null });
    expect(resultado).not.toEqual({ value: 0 });
  });

  it("lê datas em formato brasileiro, ISO e série do Excel", () => {
    expect(parseDate("15/03/1994")).toEqual({ iso: "1994-03-15" });
    expect(parseDate("1994-03-15")).toEqual({ iso: "1994-03-15" });
    expect(parseDate(34408)).toEqual({ iso: "1994-03-15" });
  });

  it("recusa data inexistente e formato desconhecido", () => {
    expect(parseDate("31/02/2026")).toHaveProperty("error");
    expect(parseDate("ontem")).toHaveProperty("error");
    expect(parseDate("15/03/94")).toHaveProperty("error");
  });

  it("interpreta a classificação de risco de forma tolerante", () => {
    expect(parseRisk("Alto Risco")).toBe("alto");
    expect(parseRisk("RISCO HABITUAL")).toBe("habitual");
    expect(parseRisk("baixo")).toBe("habitual");
    expect(parseRisk("")).toBeNull();
    expect(parseRisk("indefinido")).toBeNull();
  });

  it("normaliza nome para desduplicação sem alterar o nome exibido", () => {
    expect(normalizeName("María JOSÉ da Silva")).toBe("maria jose da silva");
  });
});

const CABECALHO = [
  "Nome da Gestante",
  "Data de Nascimento",
  "DUM",
  "Risco",
  "Consultas",
];

function planilha(linhas: Matriz): Matriz {
  return [CABECALHO, ...linhas];
}

describe("conversão da planilha", () => {
  it("converte linhas válidas para o modelo canônico", () => {
    const resultado = parsePecMatrix(
      planilha([
        ["Ana Souza", "15/03/1994", "01/02/2026", "Alto risco", "3"],
        ["Beatriz Lima", "20/07/1999", "10/01/2026", "Habitual", "8"],
      ]),
    );

    expect(resultado.rows).toHaveLength(2);
    expect(resultado.rows[0]).toMatchObject({
      displayName: "Ana Souza",
      birthDate: "1994-03-15",
      prenatalStartDate: "2026-02-01",
      riskLevel: "alto",
      prenatalVisits: 3,
      dedupKey: "ana souza|1994-03-15",
    });
    expect(resultado.rows[1].riskLevel).toBe("habitual");
  });

  it("localiza o cabeçalho mesmo com linhas de título acima", () => {
    const resultado = parsePecMatrix([
      ["Relatório de gestantes - UBS Exemplo"],
      [],
      CABECALHO,
      ["Ana Souza", "15/03/1994", "01/02/2026", "Alto", "3"],
    ]);
    expect(resultado.headerRow).toBe(3);
    expect(resultado.rows).toHaveLength(1);
  });

  it("falha explicitamente quando não há coluna de nome", () => {
    expect(() =>
      parsePecMatrix([
        ["Coluna A", "Coluna B"],
        ["1", "2"],
      ]),
    ).toThrow(PecParseError);
  });

  it("recusa a linha inteira quando um valor é inválido", () => {
    const resultado = parsePecMatrix(
      planilha([
        ["Ana Souza", "15/03/1994", "01/02/2026", "Alto", "3"],
        ["Carla Dias", "15/03/1994", "01/02/2026", "Alto", "12abc"],
      ]),
    );
    expect(resultado.rows).toHaveLength(1);
    expect(resultado.issues.some((i) => i.field === "prenatalVisits")).toBe(true);
  });

  it("ignora linhas totalmente vazias sem gerar ruído", () => {
    const resultado = parsePecMatrix(
      planilha([
        ["Ana Souza", "15/03/1994", "01/02/2026", "Alto", "3"],
        ["", "", "", "", ""],
      ]),
    );
    expect(resultado.rows).toHaveLength(1);
    expect(resultado.issues).toHaveLength(0);
  });
});

describe("desduplicação", () => {
  it("descarta repetição dentro do mesmo arquivo", () => {
    const resultado = parsePecMatrix(
      planilha([
        ["Ana Souza", "15/03/1994", "01/02/2026", "Alto", "3"],
        ["ANA SOUZA", "15/03/1994", "05/02/2026", "Alto", "4"],
      ]),
    );
    expect(resultado.rows).toHaveLength(1);
    expect(resultado.duplicatesInFile).toBe(1);
  });

  it("distingue homônimas com datas de nascimento diferentes", () => {
    const resultado = parsePecMatrix(
      planilha([
        ["Ana Souza", "15/03/1994", "01/02/2026", "Alto", "3"],
        ["Ana Souza", "22/09/1988", "01/02/2026", "Alto", "3"],
      ]),
    );
    expect(resultado.rows).toHaveLength(2);
    expect(resultado.duplicatesInFile).toBe(0);
  });

  // Sem data de nascimento não há desduplicação segura: é preferível criar um
  // registro novo e avisar a merge silencioso de duas pessoas distintas.
  it("não deduplica quando falta data de nascimento, e avisa", () => {
    const resultado = parsePecMatrix(
      planilha([
        ["Ana Souza", "", "01/02/2026", "Alto", "3"],
        ["Ana Souza", "", "01/02/2026", "Alto", "3"],
      ]),
    );
    expect(resultado.rows).toHaveLength(2);
    expect(resultado.rows.every((r) => r.dedupKey === null)).toBe(true);
    expect(resultado.issues.filter((i) => i.field === "birthDate")).toHaveLength(2);
  });

  // A chave nunca deriva de CPF/CNS — eles não existem no modelo.
  it("a chave de desduplicação usa apenas nome normalizado e nascimento", () => {
    const resultado = parsePecMatrix(
      planilha([["Ana Souza", "15/03/1994", "", "", ""]]),
    );
    expect(resultado.rows[0].dedupKey).toBe("ana souza|1994-03-15");
  });
});

describe("leitura de CSV", () => {
  it("detecta ponto e vírgula, padrão das exportações brasileiras", () => {
    expect(detectDelimiter("Nome;Data;Risco")).toBe(";");
    expect(detectDelimiter("Nome,Data,Risco")).toBe(",");
  });

  it("respeita campos entre aspas com separador interno", () => {
    const linhas = parseCsv('Nome;Obs\n"Souza, Ana";"disse ""ok"""');
    expect(linhas[1]).toEqual(["Souza, Ana", 'disse "ok"']);
  });

  it("remove BOM para não contaminar o primeiro cabeçalho", () => {
    const linhas = parseCsv("﻿Nome;Idade\nAna;30");
    expect(linhas[0][0]).toBe("Nome");
  });

  it("integra com o parser sobre um CSV completo", () => {
    const csv = [
      "Nome da Gestante;Data de Nascimento;DUM;Risco;Consultas",
      "Ana Souza;15/03/1994;01/02/2026;Alto risco;3",
      "Beatriz Lima;20/07/1999;10/01/2026;Habitual;8",
    ].join("\n");
    const resultado = parsePecMatrix(parseCsv(csv));
    expect(resultado.rows).toHaveLength(2);
    expect(resultado.rows[0].displayName).toBe("Ana Souza");
  });
});
