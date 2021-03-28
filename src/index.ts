const fs = require('fs').promises
import path from 'path'
import { Config } from './config'
import { IgApiClient, UserStoryFeedResponseItemsItem } from 'instagram-private-api'

import _ from 'lodash'
import download from 'download'
import mkdirp from 'mkdirp'
import { IImageDimensions } from './interfaces/IImageDimensions'

class InstagramManagement {
  async initialize() {
    await this.instagram.simulate.preLoginFlow()
    this.currentUser = await this.instagram.account.login(Config.Instagram.Username, Config.Instagram.Password)
    console.log(`Logged in to Instagram as : ${this.currentUser}`)
  }

  instagram: IgApiClient
  currentUser: any
  constructor() {
    this.instagram = new IgApiClient()
    this.instagram.state.generateDevice(Config.Instagram.Username)

    this.currentUser = null
  }

  async saveFile(fileURL: string, baseFolder: string | undefined) {
    return download(fileURL, baseFolder)
  }

  findBestQuality(listOfVersions: UserStoryFeedResponseItemsItem[]) {
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
    await mkdirp(baseFolder)
    const storyFeed = this.instagram.feed.userStory(await this.instagram.user.getIdByUsername(username))
    await storyFeed.request()

    let resolve: Function
    // eslint-disable-next-line promise/param-names
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

const configFilePath = Config.TimestampFile || 'next_execution_timestamp'

async function executeScrape(time: number) {
  const timeNow = new Date()
  await Promise.all(
    Config.Targets.targets.map(async (un: string) => {
      console.info({
        message: 'Started scraping',
        username: un,
      })

      let folderPth: string
      if (Config.FolderFormat === 1) {
        folderPth = path.join(Config.BaseFolder, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`, un)
      } else if (Config.FolderFormat === 2) {
        folderPth = path.join(Config.BaseFolder, un, `${timeNow.getFullYear()}-${timeNow.getMonth() + 1}`, `${timeNow.getDate().toString()}/`)
      } else {
        throw new Error(`Execute Scrape Error: Invalid Folder Format found: ${Config.FolderFormat}`)
      }
      InstagramManagement.scrapeStories(un, folderPth)
      console.log(`finished scraping user ${un}`)
    })
  )

  const nextTicker = time + 24 * 60 * 60 * 1000
  const b = Buffer.alloc(8)
  b.writeDoubleLE(nextTicker)
  await fs.writeFile(configFilePath, b)
  setTimeout(() => executeScrape(nextTicker), nextTicker - Date.now())
}

async function main() {
  InstagramManagement.initialize()

  console.log(`Instagram Management instance initialized!`)
  try {
    await fs.access(configFilePath)
  } catch (e) {
    await executeScrape(Date.now())
    return
  }
  const time1 = Date.now()
  let nextTick = (await fs.readFile(configFilePath)).readDoubleLE()
  const offset = time1 - Date.now()
  nextTick = nextTick + offset
  const timeRemaining = nextTick - Date.now()

  setTimeout(() => executeScrape(nextTick), timeRemaining)
}

main().catch((e) => console.error(e))

export const im = new InstagramManagement()
