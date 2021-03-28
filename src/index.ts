import path from 'path'
import fs from 'fs'
import toml from 'toml'
import _ from 'lodash'
import mkdirp from 'mkdirp'
import download from 'download'
import { IgApiClient, UserStoryFeedResponseItemsItem } from 'instagram-private-api'
import { IScraperConfig } from './interfaces/IScraperConfig'
import { IImageDimensions } from './interfaces/IImageDimensions'

const tomlConfigPath: string = fs.readFileSync(process.env.CONFIG_PATH || 'config.toml').toString()
const runtimeConfig: IScraperConfig = toml.parse(tomlConfigPath)

class InstagramManagement {
  async initialize() {
    await this.instagram.simulate.preLoginFlow()
    this.currentUser = await this.instagram.account.login(runtimeConfig.Instagram.Username, runtimeConfig.Instagram.Password)
    console.log(`Logged in to Instagram as : ${this.currentUser}`)
  }

  instagram: IgApiClient
  currentUser: any
  constructor() {
    this.instagram = new IgApiClient()
    this.instagram.state.generateDevice(runtimeConfig.Instagram.Username)

    this.currentUser = null
  }

  async saveFile(fileURL: string, baseFolder: string | undefined) {
    return download(fileURL, baseFolder)
  }

  async findBestQuality(listOfVersions: UserStoryFeedResponseItemsItem[]) {
    return _.first(
      listOfVersions.sort((version: IImageDimensions) => {
        return version.height * version.width
      })
    )
  }

  async saveStory(storyData: UserStoryFeedResponseItemsItem, baseFolder: any) {
    switch (storyData.media_type) {
      case 1:
        await this.saveFile(this.findBestQuality(storyData.image_versions2.candidates), baseFolder)
        break
      case 2:
        await this.saveFile(this.findBestQuality(storyData.video_versions), baseFolder)
        break
      default:
        throw new Error(`SaveStory method: hit default case in story.Datamedia_type switch`)
        break
    }
  }

  async scrapeStories(username: string, baseFolder: string) {
    await mkdirp(`${baseFolder}/${username}`)
    const storyFeed = this.instagram.feed.userStory(await this.instagram.user.getIdByUsername(username))
    await storyFeed.request()

    let resolve: Function
    const r = new Promise((rz) => {
      resolve = rz
    })
    storyFeed.items$.subscribe(
      (storyList) => {
        return storyList.map((s) => this.saveStory(s, baseFolder))
      },
      (error) => {
        throw new Error(error)
      },
      () => {
        console.log('Done scraping.')
        resolve()
      }
    )

    return r
  }
}

const runAgainNext = runtimeConfig.TimestampFile || 'next_execution_timestamp'

async function executeScrape(time: number) {
  const timeNow = new Date()
  await Promise.all(
    runtimeConfig.Targets.map(async (scrapedUser: string) => {
      console.log(`Started scraping ${scrapedUser}`)

      let folderPth: string
      if (runtimeConfig.FolderFormat === 1) {
        folderPth = path.join(runtimeConfig.BaseFolder, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`, scrapedUser)
      } else if (runtimeConfig.FolderFormat === 2) {
        folderPth = path.join(runtimeConfig.BaseFolder, scrapedUser, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`)
      } else {
        throw new Error(`Execute Scrape Error: Invalid Folder Format found: ${runtimeConfig.FolderFormat}`)
      }
      InstagramManagement.scrapeStories(scrapedUser, folderPth)
      console.log(`finished scraping user ${scrapedUser}`)
    })
  )

  const nextTicker: number = time + 24 * 60 * 60 * 1000
  const buffer: Buffer = Buffer.alloc(8)
  buffer.writeDoubleLE(nextTicker)
  fs.writeFileSync(runAgainNext, buffer)
  setTimeout(() => executeScrape(nextTicker), nextTicker - Date.now())
}

async function main() {
  InstagramManagement.initialize()

  console.log(`Instagram Management instance initialized!`)
  try {
    fs.accessSync(runAgainNext)
  } catch (e) {
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

main().catch((e) => console.error(e))

export const im = new InstagramManagement()
