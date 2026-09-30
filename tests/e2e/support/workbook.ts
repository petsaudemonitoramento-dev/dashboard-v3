import * as XLSX from "xlsx";

const HEADER = [
  "CNES",
  "Estabelecimento",
  "Tipo estabelecimento",
  "INE",
  "Equipe",
  "Tipo equipe",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "Pontos total",
  "Denominador",
  "Razão oficial",
];

export function validWorkbook() {
  // O importador PostgreSQL preservado da origem SIAPS espera a primeira linha
  // de dados a partir da linha 19. O fixture reproduz esse layout oficial.
  const metadata = Array.from({ length: 17 }, (_, index) => [
    index === 0 ? "Competência 12/2098" : "",
  ]);
  const row = [
    "9991001",
    "E2E UBS Importada",
    "UBS",
    "9991000001",
    "E2E Equipe Importada",
    "eSF",
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    110,
    3,
    36.67,
  ];
  const sheet = XLSX.utils.aoa_to_sheet([...metadata, HEADER, row]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "C3");
  return Buffer.from(
    XLSX.write(book, { type: "array", bookType: "xlsx", compression: true }),
  );
}

export function invalidWorkbook() {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Competência 12/2098"],
    ["CNES", "Estabelecimento"],
    ["9991001", "E2E UBS Inválida"],
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "C3");
  return Buffer.from(XLSX.write(book, { type: "array", bookType: "xlsx" }));
}
