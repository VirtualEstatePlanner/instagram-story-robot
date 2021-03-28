import { Config } from './config'
import { IgApiClient, UserStoryFeedResponseItemsItem } from 'instagram-private-api'

import _ from 'lodash'
import winston from 'winston'
import download from 'download'
import mkdirp from 'mkdirp'
import { IImageDimensions } from './interfaces/IImageDimensions'

export class InstagramManagement {
  static initialize() {
    throw new Error('Method not implemented.')
  }
  static scrapeStories(un: string, folderPth: string) {
    throw new Error('Method not implemented.')
  }
  instagram: IgApiClient
  currentUser: any
  constructor() {
    this.instagram = new IgApiClient()
    this.instagram.state.generateDevice(Config.Instagram.Username)

    this.currentUser = null
  }

  async initialize() {
    await this.instagram.simulate.preLoginFlow()
    this.currentUser = await this.instagram.account.login(Config.Instagram.Username, Config.Instagram.Password)
    winston.debug('Current User:', this.currentUser)
    winston.info('Logged into Instagram.')
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
        winston.error('Found unknown type of file:', storyData)
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
      (error) => winston.error(error),
      () => {
        winston.debug('Done scraping.')
        resolve()
      }
    )

    return r
  }
}

export const im = new InstagramManagement()
