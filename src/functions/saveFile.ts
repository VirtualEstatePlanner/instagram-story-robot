import download from 'download'

export const saveFile: Function = async (fileURL: string, baseFolder: string | undefined) => {
  return await download(fileURL, baseFolder)
}
