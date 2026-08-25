import { supabase } from '@/shared/supabase/client';

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
 * Upload de imagem para Supabase Storage (com fallback transparente para Base64 otimizado)
 */
export async function uploadAlojamentoPhoto(file: File | Blob, prefix = 'alojamento'): Promise<string> {
  const { blob, base64 } = await optimizeImage(file);

  try {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${prefix}_${timestamp}_${randomSuffix}.jpg`;
    const filePath = `photos/${fileName}`;

    // Tenta upload no bucket 'alojamentos'
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

  // Fallback seguro: retorna o Base64 otimizado
  return base64;
}

/**
 * Faz download de uma imagem (URL pública ou Base64) diretamente para o dispositivo do usuário
 */
export function downloadImage(url: string, filename = 'alojamento_foto.jpg') {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
