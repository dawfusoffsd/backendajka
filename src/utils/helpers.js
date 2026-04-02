function detectOperator(number) {
  const clean = number.replace(/\D/g, '');
  let prefix = '';
  if (clean.startsWith('2')) prefix = clean.slice(1, 4);
  else if (clean.startsWith('0')) prefix = clean.slice(0, 3);
  else if (clean.length >= 2) prefix = '0' + clean.slice(0, 2);
  if (prefix === '010') return 'فودافون';
  if (prefix === '011') return 'اتصالات';
  if (prefix === '012') return 'أورانج';
  if (prefix === '015') return 'وي';
  return '';
}

function normalizeSIMNumber(number) {
  const clean = number.replace(/\D/g, '');
  if (clean.startsWith('2')) return clean.slice(1);
  if (!clean.startsWith('0') && clean.length >= 2) return '0' + clean;
  return clean;
}

module.exports = { detectOperator, normalizeSIMNumber };
