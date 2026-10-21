import { parse } from "csv-parse/sync";

export type ParticipantRow = {
  name: string;
  email: string;
};

export class CsvService {
  static parseParticipants(csvString: string): ParticipantRow[] {
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handles Excel BOM
    });

    return records.map((r: any) => ({
      name: r.name || r.Name || r.NAME || "",
      email: r.email || r.Email || r.EMAIL || "",
    })).filter((r: ParticipantRow) => r.name && r.email);
  }
}
