//FIXME: This shouldn't be a singleton, but passing it through the whole CLI is a bit of a pain right now

class Known {
  private filesPaths: Set<string> = new Set();
  filesNames: Set<string> = new Set();

  addFilesPaths = (filesPaths: Array<string> | Set<string>): void => {
    if (!this.filesPaths.size) {
      this.filesPaths = new Set(filesPaths);
    } else {
      for (const filePath of filesPaths) {
        this.filesPaths.add(filePath);
      }
    }
  };

  addFilesNames = (filesNames: Array<string> | Set<string>): void => {
    if (!this.filesNames.size) {
      this.filesNames = new Set(filesNames);
    } else {
      for (const fileName of filesNames) {
        this.filesNames.add(fileName);
      }
    }
  };

  hasFilePath = (filePath: string): boolean => {
    return this.filesPaths.has(filePath);
  };

  hasFileName = (fileName: string): boolean => {
    return this.filesNames.has(fileName);
  };

  reset = (): void => {
    this.filesPaths = new Set();
    this.filesNames = new Set();
  };
}

export default new Known();
