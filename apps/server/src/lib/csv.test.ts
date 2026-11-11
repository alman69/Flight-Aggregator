import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvObjects, toCsv } from './csv';

describe('CSV', () => {
  it('handles quotes, escaped quotes, commas and newlines in fields', () => {
    expect(parseCsv('a,"b, c","say ""hi""","line\nbreak"\r\n1,2,3,4\n')).toEqual([
      ['a', 'b, c', 'say "hi"', 'line\nbreak'],
      ['1', '2', '3', '4'],
    ]);
  });

  it('keeps empty fields and handles a missing trailing newline', () => {
    expect(parseCsv('a,,c\n,,')).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
    ]);
  });

  it('strips a byte-order mark and maps rows to header names', () => {
    expect(parseCsvObjects('﻿id,name\n1,"São Paulo"\n\n')).toEqual([
      { id: '1', name: 'São Paulo' },
    ]);
  });

  it('round-trips through toCsv', () => {
    const rows = [['x', 'with, comma', 'with "quote"', '']];
    expect(parseCsv(toCsv(['a', 'b', 'c', 'd'], rows)).slice(1)).toEqual(rows);
  });
});
