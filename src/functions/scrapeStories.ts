import mkdirp from 'mkdirp'
import { UserStoryFeedResponseItemsItem } from 'instagram-private-api'
import { saveStory } from './saveStory'
import { instagramClient } from './igClient'
import { UserStoryFeed } from 'instagram-private-api/dist/feeds/user-story.feed'

export const scrapeStories: Function = async (username: string, baseFolder: string): Promise<unknown> => {
  console.log(`scraping story for ${username}`)
  console.log(`creating folder for ${username}`)
  await mkdirp(`${baseFolder}`)
  console.log(`creating request`)
  const storyFeed: UserStoryFeed = instagramClient.feed.userStory(await instagramClient.user.getIdByUsername(username))
  console.log(storyFeed)
  console.log(`sending request`)
  await storyFeed.request()

  let resolve: Function

  const scrapePromise: Promise<unknown> = new Promise((resolution) => (resolve = resolution))
  storyFeed.items$.subscribe(
    (storyList: UserStoryFeedResponseItemsItem[]) => {
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
