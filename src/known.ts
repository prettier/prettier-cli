//FIXME: This shouldn't be a singleton, but passing it through the whole CLI is a bit of a pain right now

class Known {
  private files: Set<string> = new Set();
  private folders: Set<string> = new Set();

  addFiles(filesPaths: Array<string> | Set<string>): void {
    if (!this.files.size) {
      this.files = new Set(filesPaths);
    } else {
      for (const filePath of filesPaths) {
        this.files.add(filePath);
      }
    }
  }

  addFolders(folderPaths: Array<string> | Set<string>): void {
    if (!this.folders.size) {
      this.folders = new Set(folderPaths);
    } else {
      for (const folderPath of folderPaths) {
        this.folders.add(folderPath);
      }
    }
  }

  hasFile(filePath: string): boolean {
    return this.files.has(filePath);
  }

  hasFolder(folderPath: string): boolean {
    return this.folders.has(folderPath);
  }

  reset(): void {
    this.files = new Set();
    this.folders = new Set();
  }
}

export default new Known();
