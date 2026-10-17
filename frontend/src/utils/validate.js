export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
export function validateRegister(f) {
  const e = {};
  if ((f.name || '').trim().length < 2) e.name = 'Enter your full name';
  if (!emailOk(f.email)) e.email = 'Enter a valid email address';
  if ((f.password || '').length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'At least 8 characters with a letter and a digit';
  return e;
}
export function validateLogin(f) {
  const e = {};
  if (!emailOk(f.email)) e.email = 'Enter a valid email address';
  if (!f.password) e.password = 'Enter your password';
  return e;
}
export function validateCrop(f) {
  const e = {};
  if ((f.name || '').trim().length < 2) e.name = 'Crop name is required';
  if (!f.category) e.category = 'Choose a category';
  if (f.quantity === '' || Number(f.quantity) < 0 || Number.isNaN(Number(f.quantity))) e.quantity = 'Enter a valid quantity';
  if (f.priceInr === '' || Number(f.priceInr) < 0 || Number.isNaN(Number(f.priceInr))) e.priceInr = 'Enter a valid price';
  if ((f.location || '').trim().length < 2) e.location = 'Location is required';
  return e;
}
