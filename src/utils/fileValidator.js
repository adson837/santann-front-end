const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const validateImage = (file) => {
  const errors = [];

  if (file.size > MAX_FILE_SIZE) {
    errors.push('Arquivo muito grande. Tamanho máximo: 5MB');
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.push('Tipo de arquivo não permitido. Aceitos: JPG, PNG, GIF, WebP');
  }

  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (!allowedExtensions.includes(extension)) {
    errors.push('Extensão não permitida: .' + extension);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateDocument = (file) => {
  const errors = [];

  if (file.size > MAX_FILE_SIZE) {
    errors.push('Arquivo muito grande. Tamanho máximo: 5MB');
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    errors.push('Tipo de arquivo não permitido. Aceitos: PDF, DOC, DOCX, XLS, XLSX');
  }

  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
  if (!allowedExtensions.includes(extension)) {
    errors.push('Extensão não permitida: .' + extension);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};