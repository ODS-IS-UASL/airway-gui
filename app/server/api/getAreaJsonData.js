import { readFileSync } from 'fs';
import path from 'path';

export default defineEventHandler(() => {
  const filePath = path.resolve('assets/tmpDatabase/area.json');
  const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'));
  return {
    data: jsonData
  };
});