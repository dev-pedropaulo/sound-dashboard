const fs = require('fs');

function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

const content = fs.readFileSync('C:\\Users\\devpe\\Downloads\\leads\\Formul__rio_20_10_2026.csv', 'utf8');
const [header, ...rows] = parseCSV(content);
console.log('Headers count:', header.length);
header.forEach((h, idx) => console.log(`${idx}: ${h}`));
console.log('Total data rows:', rows.length);

// Print sample mapping for row 1
const rowObj = {};
header.forEach((h, idx) => {
  rowObj[h] = rows[0][idx];
});
console.log('\nSample row 0:');
console.log(JSON.stringify(rowObj, null, 2));
