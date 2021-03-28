import fs from 'fs'
import path from 'path'
import * as IGAPI from 'instagram-private-api'
import _ from 'lodash'
import download from 'download'
import mkdirp from 'mkdirp'
import toml from 'toml'

// create interface for scraper config
interface IScraperConfig {
  Instagram: {
    Username: string
    Password: string
  }
  FolderFormat: number
  TimestampFile: string
  Targets: {
    targets: string[]
  }
  BaseFolder: string
}

// read config.toml file
const tomlConfig: string = fs.readFileSync(`./config.toml`).toString()
// parse toml into config
const runtimeConfig: IScraperConfig = toml.parse(tomlConfig)

const runAgainNext = `./next_execution_timestamp`

// create instance of instagram API object
let instagramClient: IGAPI.IgApiClient = new IGAPI.IgApiClient()
// setup api object
instagramClient.simulate.preLoginFlow()
instagramClient.state.generateDevice(runtimeConfig.Instagram.Username)
// login to api
instagramClient.account.login(runtimeConfig.Instagram.Username, runtimeConfig.Instagram.Password)
// sorts versions by resolution, returns highest resolution version
const findBestQuality: Function = async (listOfVersions: IGAPI.UserStoryFeedResponseItemsItem[]): Promise<IGAPI.UserStoryFeedResponseItemsItem | undefined> => {
  console.log(`sorting by resolution`)
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

// writes file to disk
const saveFile: Function = async (fileURL: string, baseFolder: string | undefined) => {
  console.log(`saving ${fileURL}`)
  return await download(fileURL, baseFolder)
}

// determines if a story is an image or video, then saves the highest quality version of it
const saveStory: Function = async (storyData: IGAPI.UserStoryFeedResponseItemsItem, baseFolder: any) => {
  console.log(`checking if story is image or video`)
  switch (storyData.media_type) {
    case 1:
      console.log(`media type is image`)
      await saveFile(findBestQuality(storyData.image_versions2.candidates), baseFolder)
      break
    case 2:
      console.log(`media type is video`)
      await saveFile(findBestQuality(storyData.video_versions), baseFolder)
      break
    default:
      throw new Error(`Error in saveStory: hit default case in storyData.media_type switch`)
  }
}

//
const scrapeStories: Function = async (username: string, baseFolder: string): Promise<unknown> => {
  console.log(`scraping story for ${username}`)
  console.log(`creating folder for ${username}`)
  await mkdirp(`${baseFolder}/${username}`)
  const storyFeed = instagramClient.feed.userStory(await instagramClient.user.getIdByUsername(username))
  console.log(`requesting story`)
  await storyFeed.request()

  let resolve: Function

  const scrapePromise: Promise<unknown> = new Promise((resolution) => (resolve = resolution))
  storyFeed.items$.subscribe(
    (storyList: IGAPI.UserStoryFeedResponseItemsItem[]) => {
      return storyList.map((story) => saveStory(story, baseFolder))
    },
    (error: string) => {
      throw new Error(`Error in scrapeStory: ${error}`)
    },
    () => {
      resolve()
    }
  )
  return scrapePromise
}

const executeScrape: Function = async (time: number): Promise<void> => {
  const timeNow = new Date()
  const nextTicker: number = time + 24 * 60 * 60 * 1000
  const buffer: Buffer = Buffer.alloc(8)
  console.log(runtimeConfig)
  console.log(runtimeConfig.Targets)
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
  console.log(`writing timestamp for next scrape to disk`)
  fs.writeFileSync(runAgainNext, buffer)
  setTimeout(() => executeScrape(nextTicker), nextTicker - Date.now())
}

const main: Function = async (): Promise<void> => {
  try {
    fs.accessSync(runAgainNext)
  } catch (e: unknown) {
    console.log(`scraping from main function after catch`)
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

main().catch((e: Error): void => {
  console.log(`running main function`)
  console.log(e)
  throw new Error(e.toString())
})
