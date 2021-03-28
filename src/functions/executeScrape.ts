import fs from 'fs'
import path from 'path'
import toml from 'toml'
import { IScraperConfig } from '../interfaces/IScraperConfig'
import { scrapeStories } from './scrapeStories'

export const executeScrape: Function = async (time: number): Promise<void> => {
  const tomlConfig: string = fs.readFileSync(`./config.toml`).toString()
  const runtimeConfig: IScraperConfig = toml.parse(tomlConfig)
  const timeNow = new Date()
  const nextTicker: number = time + 24 * 60 * 60 * 1000
  const buffer: Buffer = Buffer.alloc(8)
  runtimeConfig.Targets.targets.map((eachTarget: string): void => {
    let folderPath: string
    if (runtimeConfig.FolderFormat === 1) {
      folderPath = path.join(runtimeConfig.BaseFolder, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`, eachTarget)
    } else if (runtimeConfig.FolderFormat === 2) {
      folderPath = path.join(runtimeConfig.BaseFolder, eachTarget, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`)
    } else {
      throw new Error(`Execute Scrape Error: Invalid Folder Format found: ${runtimeConfig.FolderFormat}`)
    }
    scrapeStories(eachTarget, folderPath)
  })
  buffer.writeDoubleLE(nextTicker)
  //  console.log(`writing timestamp for next scrape to disk`)
  //  fs.writeFileSync(`./next_execution_timestamp`, buffer)
  setTimeout(() => executeScrape(nextTicker), nextTicker - Date.now())
}
