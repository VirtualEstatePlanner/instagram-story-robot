import _ from 'lodash'
import { UserStoryFeedResponseItemsItem } from 'instagram-private-api'

export const findBestQuality: Function = async (listOfVersions: UserStoryFeedResponseItemsItem[]): Promise<UserStoryFeedResponseItemsItem | undefined> => {
  console.log(`sorting by resolution`)
  return _.first(
    listOfVersions.sort((version: UserStoryFeedResponseItemsItem, version2: UserStoryFeedResponseItemsItem) => {
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
