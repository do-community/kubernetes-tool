// Defines a very basic filesystem using GitHub.
export default class GitHubFS {
    public repo: string

    // Constructs the class.
    public constructor(repo: string) {
        this.repo = repo
    }

    // Lists the folder specified.
    public async ls(folder: string): Promise<{
        file: boolean;
        path: string;
        name: string;
    }[]> {
        const items: {
            file: boolean;
            path: string;
            name: string;
        }[] = []
        const res = await fetch(`https://api.github.com/repos/${this.repo}/contents/${folder}`)
        const json = await res.json()
        for (const item of json) {
            items.push({
                file: item.type !== "dir",
                name: item.name,
                path: item.path,
            })
        }
        return items
    }

    // Gets the item specified. Returns null if it is not found.
    public async get(fp: string): Promise<string | undefined> {
        const res = await fetch(`https://raw.githubusercontent.com/${this.repo}/master/${fp}`)
        if (!res.ok) return undefined
        return await res.text()
    }
}
