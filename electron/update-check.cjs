const latestReleaseApiUrl =
  "https://api.github.com/repos/coffeedeveloper/oolong/releases/latest";
const latestReleaseUrl = "https://github.com/coffeedeveloper/oolong/releases/latest";

function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(value).trim());
  if (!match) {
    return null;
  }

  return {
    version: `${match[1]}.${match[2]}.${match[3]}`,
    parts: match.slice(1, 4).map(Number),
    prerelease: Boolean(match[4])
  };
}

function isNewerVersion(candidate, current) {
  for (let index = 0; index < candidate.parts.length; index += 1) {
    if (candidate.parts[index] !== current.parts[index]) {
      return candidate.parts[index] > current.parts[index];
    }
  }

  return current.prerelease && !candidate.prerelease;
}

function createUpdateChecker({ app, net, timeoutMs = 8000, onError = console.warn }) {
  let checkPromise = null;

  async function fetchAvailableUpdate() {
    if (!app.isPackaged) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await net.fetch(latestReleaseApiUrl, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
      }

      const release = await response.json();
      const candidate = parseVersion(release?.tag_name);
      const current = parseVersion(app.getVersion());
      if (!candidate || !current || !isNewerVersion(candidate, current)) {
        return null;
      }

      return { version: candidate.version };
    } catch (error) {
      onError("Failed to check for updates:", error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  function checkForUpdates() {
    if (!checkPromise) {
      checkPromise = fetchAvailableUpdate();
    }

    return checkPromise;
  }

  return { checkForUpdates };
}

module.exports = {
  createUpdateChecker,
  isNewerVersion,
  latestReleaseUrl,
  parseVersion
};
