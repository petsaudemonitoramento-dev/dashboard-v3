"use client";

import Image from "next/image";
import { FileText, Printer, Save, Trash2, X, StickyNote } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { managePrivateNote } from "@/app/(sistema)/sistema/gestao/notes-actions";

type Stat = { label: string; value: string; detail: string };
type Practice = { code: string; label: string; value: number | null; fulfilled: number; description: string };
type Monthly = { month: string; c3: number | null; a: number | null; b: number | null };
type Classified = { label: string; total: number };
type Comparison = { name: string; value: number };
type ImportItem = { date: string; competency: string; records: number; status: string };
export type ManagementReportData = {
  period: string;
  periodStart: string;
  periodEnd: string;
  generatedFor: string;
  filters: string[];
  latestUpdate: string;
  c3: string;
  classification: string;
  eligible: string;
  teams: number;
  establishments: number;
  unknownDistrictEstablishments: number;
  competencies: number;
  stats: Stat[];
  practices: Practice[];
  monthly: Monthly[];
  classified: Classified[];
  comparisonMode: string;
  comparison: Comparison[];
  imports: ImportItem[];
  importVisible: boolean;
  attention: { code: string; label: string; value: number; description: string }[];
};

function pct(n: number | null) {
  return n === null ? "Sem dados" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

function ReportBody({ data, notes }: { data: ManagementReportData; notes: string }) {
  return (
    <div className="management-report-document">
      <header className="management-report-doc-header">
        <Image src="/brands/mae-aps-assinatura-unificada.svg" alt="MAE APS" width={260} height={100} unoptimized />
        <Image src="/brands/ufcg-oficial.png" alt="Universidade Federal de Campina Grande" width={220} height={75} unoptimized />
      </header>
      <div className="management-report-doc-heading">
        <span>MAE APS · Monitoramento, Atenção e Estratégia na APS</span>
        <h1>Relatório de acompanhamento da Gestão</h1>
        <p>Recorte analisado: <strong>{data.period}</strong> · Atualização dos dados: {data.latestUpdate}</p>
        <p>Filtros: {data.filters.join(" · ")}</p>
      </div>
      <section>
        <h2>1. Panorama municipal e indicadores consolidados</h2>
        <div className="management-report-doc-stats">
          <div><small>Indicador C3</small><strong>{data.c3}</strong><span>{data.classification}</span></div>
          <div><small>Registros elegíveis</small><strong>{data.eligible}</strong><span>Denominador acumulado, não pessoas únicas</span></div>
          <div><small>Equipes / UBS</small><strong>{data.teams} / {data.establishments}</strong><span>Equipes e unidades únicas no recorte</span></div>
          <div><small>Competências</small><strong>{data.competencies}</strong><span>UBS sem distrito informado: {data.unknownDistrictEstablishments}</span></div>
        </div>
        <h3>Indicadores destacados na tela inicial</h3>
        <table><thead><tr><th>Indicador</th><th>Valor</th><th>Observação</th></tr></thead>
          <tbody>{data.stats.map((x) => <tr key={x.label}><td>{x.label}</td><td><strong>{x.value}</strong></td><td>{x.detail}</td></tr>)}</tbody>
        </table>
      </section>
      <section>
        <h2>2. Práticas de cuidado A–K</h2>
        <table><thead><tr><th>Prática</th><th>Cobertura</th><th>Registros com a prática</th></tr></thead>
          <tbody>{data.practices.map((p) => <tr key={p.code}>
            <td><strong>{p.code} · {p.label}</strong><small>{p.description}</small></td>
            <td>{pct(p.value)}</td><td>{p.fulfilled.toLocaleString("pt-BR")}</td>
          </tr>)}</tbody>
        </table>
        <p className="management-report-doc-footnote">Percentuais derivados do recorte oficial carregado no MAE APS. As faixas de atenção são gerenciais, não metas normativas.</p>
      </section>
      <section>
        <h2>3. Evolução mensal do C3 e práticas</h2>
        <table><thead><tr><th>Competência</th><th>C3</th><th>1ª consulta ≤ 12 semanas</th><th>7+ consultas</th></tr></thead>
          <tbody>{data.monthly.map((p) => <tr key={p.month}><td>{p.month}</td><td>{pct(p.c3)}</td><td>{pct(p.a)}</td><td>{pct(p.b)}</td></tr>)}</tbody>
        </table>
      </section>
      <section>
        <h2>4. Distribuição das equipes por classificação C3</h2>
        <table><thead><tr><th>Classificação</th><th>Equipes</th></tr></thead>
          <tbody>{data.classified.map((x) => <tr key={x.label}><td>{x.label}</td><td>{x.total.toLocaleString("pt-BR")}</td></tr>)}</tbody>
        </table>
      </section>
      <section>
        <h2>5. Comparativo — {data.comparisonMode === "team" ? "equipes" : "UBS"}</h2>
        <table><thead><tr><th>Unidade / equipe</th><th>C3</th></tr></thead>
          <tbody>{data.comparison.map((x, i) => <tr key={i}><td>{x.name}</td><td>{x.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td></tr>)}</tbody>
        </table>
        {data.comparison.length === 0 && <p>Sem comparativos neste recorte.</p>}
      </section>
      <section>
        <h2>6. Prioridades do acompanhamento</h2>
        {data.attention.length ? <table><thead><tr><th>Prática</th><th>Cobertura</th><th>Descrição</th></tr></thead><tbody>
          {data.attention.map((x) => <tr key={x.code}><td>{x.code} · {x.label}</td><td>{pct(x.value)}</td><td>{x.description}</td></tr>)}
        </tbody></table> : <p>Nenhuma prática abaixo do limiar de atenção gerencial neste recorte.</p>}
      </section>
      <section>
        <h2>7. Rastreabilidade e histórico de importações</h2>
        {data.importVisible ? <table><thead><tr><th>Data</th><th>Competência</th><th>Registros</th><th>Status</th></tr></thead><tbody>
          {data.imports.map((x, i) => <tr key={i}><td>{x.date}</td><td>{x.competency}</td><td>{x.records.toLocaleString("pt-BR")}</td><td>{x.status}</td></tr>)}
        </tbody></table> : <p>Histórico detalhado de importações indisponível para este perfil.</p>}
        {data.importVisible && !data.imports.length && <p>Não há histórico de importações disponível.</p>}
      </section>
      {notes.trim() ? <section className="management-report-personal-notes">
        <h2>8. Anotações pessoais — inclusão autorizada</h2>
        <p className="management-report-note-text">{notes}</p>
        <p className="management-report-doc-footnote">Trecho pessoal incluído neste arquivo apenas porque o próprio titular marcou a opção de inclusão.</p>
      </section> : null}
      <footer>MAE APS · PET Saúde UFCG · Documento gerado a partir dos dados visíveis ao perfil autorizado. A impressão não constitui laudo clínico.</footer>
    </div>
  );
}

export function ManagementReportAndNotes({
  data, initialNote, notesAvailable,
}: {
  data: ManagementReportData;
  initialNote: string;
  notesAvailable: boolean;
}) {
  const [note, setNote] = useState(initialNote);
  const [savedNote, setSavedNote] = useState(initialNote);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const previewRef = useRef<HTMLDivElement>(null);
  const printableNotes = includeNotes ? note : "";

  function update(operation: "save" | "delete") {
    if (!notesAvailable) return;
    const form = new FormData();
    form.set("period_start", data.periodStart);
    form.set("period_end", data.periodEnd);
    form.set("operation", operation);
    form.set("body", operation === "delete" ? "" : note);
    startTransition(async () => {
      const result = await managePrivateNote({ ok: false, body: "", message: "" }, form);
      if (result.ok) { setNote(result.body); setSavedNote(result.body); }
      setStatus(result.message);
    });
  }

  function print() {
    setPreview(false);
    // A versão de impressão é parte do DOM para respeitar CSP; nenhuma janela
    // nova, HTML arbitrário ou endpoint público de exportação.
    window.print();
  }

  return (
    <>
      <article className="dashboard-card management-report-card">
        <div className="dashboard-card-heading">
          <div><span>Relatórios</span><h2>Imprimir relatório</h2>
            <p>Gere um documento com os dados e filtros da visão municipal.</p></div>
          <FileText className="size-6" aria-hidden="true" />
        </div>
        <div className="management-report-card-icon"><Printer aria-hidden="true" /></div>
        <p className="management-report-card-description">Indicadores, práticas A–K, evolução mensal, distribuição, comparativos, prioridades e rastreabilidade.</p>
        <label className="management-report-check">
          <input type="checkbox" checked={includeNotes} onChange={(event) => setIncludeNotes(event.target.checked)} />
          Incluir minhas anotações pessoais no PDF
        </label>
        <button type="button" className="management-report-primary" onClick={() => setPreview(true)}>Pré-visualizar relatório</button>
        <button type="button" className="management-report-secondary" onClick={print}>Imprimir / salvar PDF</button>
        <small>Use “Salvar como PDF” na janela de impressão do navegador. A exportação preserva o recorte atual.</small>
      </article>

      <article className="dashboard-card management-notes-card" aria-label="Anotações pessoais do período">
        <div className="dashboard-card-heading">
          <div><span>Anotações da Gestão</span><h2>Minhas anotações</h2><p>Registre observações e oportunidades de melhoria para futuras consultas.</p></div>
          <StickyNote className="size-6" aria-hidden="true" />
        </div>
        <label htmlFor="management-private-note">Anotações do período {data.period} — visíveis apenas nesta conta</label>
        <textarea
          id="management-private-note"
          autoComplete="off"
          spellCheck
          maxLength={2000}
          disabled={!notesAvailable || pending}
          placeholder="Ex.: Observar o desempenho das equipes com menor cobertura e registrar encaminhamentos para a próxima reunião."
          value={note}
          onChange={(event) => { setNote(event.target.value); setStatus(""); }}
        />
        <div className="management-notes-controls">
          <small>Não registre nomes nem informações identificáveis de pacientes. {note.length}/2000 caracteres</small>
          <div>
            <button type="button" onClick={() => update("delete")} disabled={!notesAvailable || pending}><Trash2 className="size-4" /> Limpar</button>
            <button type="button" className="management-notes-save" onClick={() => update("save")} disabled={!notesAvailable || pending}><Save className="size-4" /> {pending ? "Salvando..." : "Salvar anotação"}</button>
          </div>
        </div>
        <p role="status" aria-live="polite" className="management-notes-message">
          {!notesAvailable ? "Diário indisponível até a migração segura do banco ser aplicada." : pending ? "Salvando com segurança..." : status || (note !== savedNote ? "Alterações ainda não salvas. Clique em Salvar anotação." : "Somente sua conta pode consultar este registro. Os dados são persistidos no banco com RLS por usuário.")}
        </p>
      </article>

      <div className="management-print-report" aria-hidden={!preview}>
        <ReportBody data={data} notes={printableNotes} />
      </div>

      {preview && <div className="management-report-modal" role="presentation" onClick={() => setPreview(false)}>
        <section ref={previewRef} className="management-report-dialog" role="dialog" aria-modal="true" aria-label="Prévia do relatório" onClick={(event) => event.stopPropagation()}>
          <div className="management-report-modal-toolbar">
            <strong>Pré-visualização do relatório</strong>
            <div>
              <button type="button" onClick={print}><Printer className="size-4" /> Imprimir / PDF</button>
              <button type="button" aria-label="Fechar pré-visualização" onClick={() => setPreview(false)}><X className="size-5" /></button>
            </div>
          </div>
          <div className="management-report-modal-scroll"><ReportBody data={data} notes={printableNotes} /></div>
        </section>
      </div>}
    </>
  );
}
