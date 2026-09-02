import { supabase } from '@/shared/supabase/client';

export interface DocumentoVistoria {
  id: string;
  nome: string;
  tipo: 'foto_dano' | 'laudo_vistoria' | 'termo_entrega' | 'comprovante_devolucao' | 'outro';
  url: string;
  tamanho_bytes?: number;
  data_upload: string;
}

/**
 * Redimensiona e comprime uma imagem para otimizar transferência e armazenamento
 */
export async function optimizeImage(file: File | Blob, maxWidth = 1280, maxHeight = 1280, quality = 0.85): Promise<{ blob: Blob; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao processar canvas de imagem.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, base64 });
            } else {
              resolve({ blob: file, base64 });
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem para otimização.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converte um arquivo qualquer (PDF, documento) em Base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload de imagem para Supabase Storage (com fallback transparente para Base64 otimizado)
 */
export async function uploadAlojamentoPhoto(file: File | Blob, prefix = 'alojamento'): Promise<string> {
  const { blob, base64 } = await optimizeImage(file);

  try {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${prefix}_${timestamp}_${randomSuffix}.jpg`;
    const filePath = `photos/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('alojamentos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('alojamentos')
        .getPublicUrl(filePath);

      if (publicUrlData && publicUrlData.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Upload no Supabase Storage indisponível, utilizando armazenamento embutido otimizado:', err);
  }

  return base64;
}

/**
 * Upload de Documento / Foto de Vistoria de Fiança
 */
export async function uploadDocumentoVistoria(
  file: File,
  tipo: DocumentoVistoria['tipo'] = 'foto_dano'
): Promise<DocumentoVistoria> {
  const isImage = file.type.startsWith('image/');
  let finalUrl = '';

  if (isImage) {
    finalUrl = await uploadAlojamentoPhoto(file, 'vistoria');
  } else {
    // Para PDFs e outros arquivos
    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `vistorias/${timestamp}_${sanitizedName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('alojamentos')
        .upload(filePath, file, {
          contentType: file.type || 'application/pdf',
          upsert: true
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('alojamentos')
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          finalUrl = publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Supabase storage fallback to Base64:', e);
    }

    if (!finalUrl) {
      finalUrl = await fileToBase64(file);
    }
  }

  return {
    id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nome: file.name,
    tipo,
    url: finalUrl,
    tamanho_bytes: file.size,
    data_upload: new Date().toISOString()
  };
}

/**
 * Faz download de um arquivo (URL pública ou Base64)
 */
export function downloadFile(url: string, filename = 'documento.pdf') {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const downloadImage = downloadFile;
