import { UserStoryFeedResponseItemsItem } from 'instagram-private-api'
import { findBestQuality } from './findBestQuality'
import { saveFile } from './saveFile'

export const saveStory: Function = async (storyData: UserStoryFeedResponseItemsItem, baseFolder: any) => {
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
