import fs from 'fs'
import path from 'path'
import * as IGAPI from 'instagram-private-api'
import _ from 'lodash'
import download from 'download'
import mkdirp from 'mkdirp'
import toml from 'toml'
import { IScraperConfig } from './interfaces/IScraperConfig'

const tomlConfig: string = fs.readFileSync('config.toml').toString()
const runtimeConfig: IScraperConfig = toml.parse(tomlConfig)
const runAgainNext = 'next_execution_timestamp'

let instagramClient: IGAPI.IgApiClient = new IGAPI.IgApiClient()
instagramClient.simulate.preLoginFlow()
instagramClient.state.generateDevice(runtimeConfig.Instagram.Username)
instagramClient.account.login(runtimeConfig.Instagram.Username, runtimeConfig.Instagram.Password)
console.log(`Logged in to Instagram as : ${runtimeConfig.Instagram.Username}`)

const findBestQuality: Function = async (listOfVersions: IGAPI.UserStoryFeedResponseItemsItem[]) => {
  return _.first(
    listOfVersions.sort((version: IGAPI.UserStoryFeedResponseItemsItem, version2: IGAPI.UserStoryFeedResponseItemsItem) => {
      if (version.original_height * version.original_width > version2.original_height * version2.original_width) {
        return 1
      }
      if (version.original_height * version.original_width < version2.original_height * version2.original_width) {
        return -1
      }
      return 0
    })
  )
}

const saveFile: Function = async (fileURL: string, baseFolder: string | undefined) => {
  return download(fileURL, baseFolder)
}

const saveStory: Function = async (storyData: IGAPI.UserStoryFeedResponseItemsItem, baseFolder: any) => {
  switch (storyData.media_type) {
    case 1:
      saveFile(findBestQuality(storyData.image_versions2.candidates), baseFolder)
      break
    case 2:
      saveFile(findBestQuality(storyData.video_versions), baseFolder)
      break
    default:
      throw new Error(`Error in saveStory: hit default case in storyData.media_type switch`)
  }
}

const scrapeStories: Function = async (username: string, baseFolder: string) => {
  await mkdirp(`${baseFolder}/${username}`)
  const storyFeed = instagramClient.feed.userStory(await instagramClient.user.getIdByUsername(username))
  await storyFeed.request()

  let resolve: Function
  const scrapePromise = new Promise((resolution) => (resolve = resolution))
  storyFeed.items$.subscribe(
    (storyList: IGAPI.UserStoryFeedResponseItemsItem[]) => {
      return storyList.map((story) => saveStory(story, baseFolder))
    },
    (error: string) => {
      throw new Error(`Error in scrapeStory: ${error}`)
    },
    () => {
      resolve()
      console.log('Done scraping.')
    }
  )
  return scrapePromise
}

const executeScrape: Function = async (time: number) => {
  const timeNow = new Date()
  const nextTicker: number = time + 24 * 60 * 60 * 1000
  const buffer: Buffer = Buffer.alloc(8)
  await Promise.all(
    runtimeConfig.Targets.map(
      async (eachTarget: string): Promise<void> => {
        console.log(`Started scraping ${eachTarget}`)

        let folderPath: string
        if (runtimeConfig.FolderFormat === 1) {
          folderPath = path.join(runtimeConfig.BaseFolder, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`, eachTarget)
        } else if (runtimeConfig.FolderFormat === 2) {
          folderPath = path.join(runtimeConfig.BaseFolder, eachTarget, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`)
        } else {
          throw new Error(`Execute Scrape Error: Invalid Folder Format found: ${runtimeConfig.FolderFormat}`)
        }
        scrapeStories(eachTarget, folderPath)
        console.log(`finished scraping user ${eachTarget}`)
      }
    )
  )
  buffer.writeDoubleLE(nextTicker)
  fs.writeFileSync(runAgainNext, buffer)
  setTimeout(() => executeScrape(nextTicker), nextTicker - Date.now())
}

const main: Function = async (): Promise<void> => {
  try {
    fs.accessSync(runAgainNext)
  } catch (e: any) {
    await executeScrape(Date.now())
    return
  }
  const time1 = Date.now()
  let nextTick = fs.readFileSync(runAgainNext).readDoubleLE()
  const offset = time1 - Date.now()
  nextTick = nextTick + offset
  const timeRemaining = nextTick - Date.now()

  setTimeout(() => executeScrape(nextTick), timeRemaining)
}

main().catch((e: Error) => console.error(e))
