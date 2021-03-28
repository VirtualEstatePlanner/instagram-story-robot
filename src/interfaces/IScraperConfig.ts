export interface IScraperConfig {
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
