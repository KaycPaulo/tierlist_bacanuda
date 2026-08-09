import { isSupabaseConfigured, supabase } from './supabase'

const AVATAR_BUCKET = 'avatars'

/**
 * Upload de arquivo de avatar para o Supabase Storage.
 * @param file - Arquivo de imagem
 * @param friendName - Nome do amigo (será convertido para minúsculo e usado no nome do arquivo)
 * @returns URL pública do avatar
 */
export async function uploadAvatar(file: File, friendName: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem')
  }

  const fileName = `avatar_${friendName.toLowerCase().trim().replace(/\s+/g, '_')}`
  const fileExt = file.name.split('.').pop()
  const filePath = `${fileName}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw new Error(`Erro ao fazer upload: ${error.message}`)

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(data.path)

  return urlData.publicUrl
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
