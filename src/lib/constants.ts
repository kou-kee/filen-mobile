import ReactNativeBlobUtil from "react-native-blob-util"
import RNFS from "react-native-fs"

export const THUMBNAIL_BASE_PATH: string = ReactNativeBlobUtil.fs.dirs.DocumentDir + "/thumbnailCache/"
export const MISC_BASE_PATH: string = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "misc/"