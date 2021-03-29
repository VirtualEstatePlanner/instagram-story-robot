import { UserStoryFeedResponseItemsItem } from 'instagram-private-api'
import { findBestQuality } from './findBestQuality'
import { saveFile } from './saveFile'

export const saveStory: Function = async (storyData: UserStoryFeedResponseItemsItem, baseFolder: any) => {
  switch (storyData.media_type) {
    case 1:
      await saveFile(findBestQuality(storyData.image_versions2.candidates), baseFolder)
      break
    case 2:
      await saveFile(findBestQuality(storyData.video_versions), baseFolder)
      break
    default:
      throw new Error(`Error in saveStory: hit default case in storyData.media_type switch`)
  }
}
