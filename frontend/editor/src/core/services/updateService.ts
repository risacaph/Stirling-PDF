export interface UpdateSummary {
  latest_version: string | null;
  latest_stable_version?: string | null;
  max_priority: "urgent" | "normal" | "minor" | "low";
  recommended_action?: string;
  any_breaking: boolean;
  migration_guides?: Array<{
    version: string;
    notes: string;
    url: string;
  }>;
}

export interface VersionUpdate {
  version: string;
  priority: "urgent" | "normal" | "minor" | "low";
  announcement: {
    title: string;
    message: string;
  };
  compatibility: {
    breaking_changes: boolean;
    breaking_description?: string;
    migration_guide_url?: string;
  };
}

export interface FullUpdateInfo {
  latest_version: string;
  latest_stable_version?: string;
  new_versions: VersionUpdate[];
}

export interface MachineInfo {
  machineType: string;
  activeSecurity: boolean;
  licenseType: string;
}

interface GitHubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
}

// The Papyra fork. Updates are checked against — and downloaded from — this repository's GitHub
// releases, rather than any upstream vendor service. No instance details are sent anywhere; the
// only request made is a public read of the releases API.
const REPO = "risacaph/Papyra-PDF";

export class UpdateService {
  private readonly latestReleaseUrl = `https://api.github.com/repos/${REPO}/releases/latest`;
  private readonly releasesApiUrl = `https://api.github.com/repos/${REPO}/releases`;

  /** Public releases page users are sent to when an update is available. */
  static readonly RELEASES_PAGE = `https://github.com/${REPO}/releases`;

  /**
   * Compare two version strings
   * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  compareVersions(version1: string, version2: string): number {
    const v1 = version1.split(".");
    const v2 = version2.split(".");

    for (let i = 0; i < v1.length || i < v2.length; i++) {
      const n1 = parseInt(v1[i]) || 0;
      const n2 = parseInt(v2[i]) || 0;

      if (n1 > n2) {
        return 1;
      } else if (n1 < n2) {
        return -1;
      }
    }

    return 0;
  }

  /** Strip a leading "v" from a release tag (e.g. "v2.3.4" -> "2.3.4"). */
  private normalizeTag(tag?: string): string {
    return (tag ?? "").trim().replace(/^v/i, "");
  }

  /**
   * Where to send the user to obtain an update. This fork ships as a Docker image built from
   * source, so there is nothing to download for Docker/Kubernetes; other install types are pointed
   * at the GitHub releases page.
   */
  getDownloadUrl(machineInfo: MachineInfo): string | null {
    if (
      machineInfo.machineType === "Docker" ||
      machineInfo.machineType === "Kubernetes"
    ) {
      return null;
    }
    return UpdateService.RELEASES_PAGE;
  }

  /**
   * Check the fork's latest GitHub release and report it when it is newer than the running
   * version. Returns null when the instance is up to date or the fork has published no releases.
   */
  async getUpdateSummary(
    currentVersion: string,
    _machineInfo: MachineInfo,
  ): Promise<UpdateSummary | null> {
    try {
      const response = await fetch(this.latestReleaseUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (response.status !== 200) {
        // 404 simply means the fork has no releases yet — treat as up to date.
        return null;
      }
      const release = (await response.json()) as GitHubRelease;
      const latest = this.normalizeTag(release.tag_name);
      if (!latest || this.compareVersions(latest, currentVersion) <= 0) {
        return null;
      }
      return {
        latest_version: latest,
        latest_stable_version: release.prerelease ? null : latest,
        max_priority: "normal",
        any_breaking: false,
        migration_guides: [],
      };
    } catch (error) {
      console.error("Failed to fetch update information from GitHub:", error);
      return null;
    }
  }

  /**
   * Fetch the fork's recent releases and describe those newer than the running version.
   */
  async getFullUpdateInfo(
    currentVersion: string,
    _machineInfo: MachineInfo,
  ): Promise<FullUpdateInfo | null> {
    try {
      const response = await fetch(`${this.releasesApiUrl}?per_page=20`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (response.status !== 200) {
        return null;
      }
      const releases = ((await response.json()) as GitHubRelease[])
        .filter((release) => !release.draft)
        .map((release) => ({
          version: this.normalizeTag(release.tag_name),
          name: release.name,
          body: release.body,
          prerelease: release.prerelease ?? false,
        }))
        .filter((release) => release.version.length > 0);

      if (releases.length === 0) {
        return null;
      }

      const newer = releases.filter(
        (release) => this.compareVersions(release.version, currentVersion) > 0,
      );

      return {
        latest_version: releases[0].version,
        latest_stable_version: releases.find((r) => !r.prerelease)?.version,
        new_versions: newer.map((release) => ({
          version: release.version,
          priority: "normal",
          announcement: {
            title: release.name || `Papyra ${release.version}`,
            message: release.body || "",
          },
          compatibility: { breaking_changes: false },
        })),
      };
    } catch (error) {
      console.error("Failed to fetch update information from GitHub:", error);
      return null;
    }
  }

  /**
   * Fetch the current version from the fork's build.gradle as a fallback.
   */
  async getCurrentVersionFromGitHub(): Promise<string> {
    const url = `https://raw.githubusercontent.com/${REPO}/main/build.gradle`;

    try {
      const response = await fetch(url);
      if (response.status === 200) {
        const text = await response.text();
        const versionRegex = /version\s*=\s*['"](\d+\.\d+\.\d+)['"]/;
        const match = versionRegex.exec(text);
        if (match) {
          return match[1];
        }
      }
      throw new Error("Version number not found");
    } catch (error) {
      console.error("Failed to fetch latest version from build.gradle:", error);
      return "";
    }
  }
}

export const updateService = new UpdateService();
