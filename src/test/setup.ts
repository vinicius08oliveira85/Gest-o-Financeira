import '@testing-library/jest-dom';

if (
  typeof (URL as unknown as { createObjectURL?: (b: Blob) => string }).createObjectURL ===
  'undefined'
) {
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () =>
    'blob:mock-url';
}
if (
  typeof (URL as unknown as { revokeObjectURL?: (u: string) => void }).revokeObjectURL ===
  'undefined'
) {
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
}
