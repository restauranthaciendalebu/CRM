import { Table, TableStatus } from "./types";

export const DEFAULT_TABLE_COUNT = 12;

function nextTableNumber(tables: Table[]): number {
  return tables.reduce((highest, table) => Math.max(highest, table.number), 0) + 1;
}

function createNumberedTable(tables: Table[], number: number, zone: string, seats: number): Table {
  const preferredId = `t${number}`;
  const id = tables.some((table) => table.id === preferredId)
    ? `t_${number}_${Math.random().toString(36).slice(2, 8)}`
    : preferredId;

  return {
    id,
    number,
    seats,
    status: TableStatus.FREE,
    zone,
    x: ((number - 1) % 4) * 20 + 10,
    y: Math.floor((number - 1) / 4) * 30 + 10,
  };
}

export function createTable(tables: Table[], zone = "Salón Principal", seats = 4): Table {
  return createNumberedTable(tables, nextTableNumber(tables), zone, seats);
}

export function ensureMinimumTables(tables: Table[], minimum = DEFAULT_TABLE_COUNT): Table[] {
  const completed = [...tables];
  while (completed.length < minimum) {
    const usedNumbers = new Set(completed.map((table) => table.number));
    let number = 1;
    while (usedNumbers.has(number)) number++;
    completed.push(createNumberedTable(completed, number, "Salón Principal", 4));
  }
  return completed.sort((a, b) => a.number - b.number);
}
