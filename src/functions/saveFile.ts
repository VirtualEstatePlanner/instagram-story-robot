import download from 'download'

export const saveFile: Function = async (fileURL: string, baseFolder: string | undefined) => {
  console.log(`saving ${fileURL}`)
  return await download(fileURL, baseFolder)
}
