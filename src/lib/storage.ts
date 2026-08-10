import { isSupabaseConfigured, supabase } from './supabase'

const AVATAR_BUCKET = 'avatars'

/**
 * Normaliza o nome do amigo para uso no arquivo:
 * minúsculas; qualquer caractere que não seja letra (a-z) ou número vira `_`.
 */
export function normalizeAvatarBaseName(friendName: string): string {
  const normalized = friendName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')

  return normalized || 'nome'
}

/**
 * Upload de arquivo de avatar para o Supabase Storage.
 * @param file - Arquivo de imagem
 * @param friendName - Nome do amigo (normalizado para o nome do arquivo)
 * @returns URL pública do avatar (com cache-buster para forçar refresh após upsert)
 */
export async function uploadAvatar(file: File, friendName: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem')
  }

  const fileName = `avatar_${normalizeAvatarBaseName(friendName)}`
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${fileName}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw new Error(`Erro ao fazer upload: ${error.message}`)

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(data.path)

  // Upsert mantém o mesmo path; o `?v=` força o browser a buscar a imagem nova.
  return `${urlData.publicUrl}?v=${Date.now()}`
}

/**
 * Remove um avatar do storage
 */
export async function deleteAvatar(filePath: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath])
  if (error) throw new Error(`Erro ao deletar: ${error.message}`)
}
