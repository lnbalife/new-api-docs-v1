import { App, Octokit } from 'octokit';

// GitHub repository info
export const owner = 'QuantumNous';
export const repo = 'new-api-docs-v1';
export const DocsCategory = 'Docs Feedback'; // GitHub Discussion

let instance: Octokit | undefined;
let initError: Error | undefined;

async function getOctokit(): Promise<Octokit | null> {
  // If we already encountered an error, don't retry
  if (initError) return null;
  if (instance) return instance;

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    console.warn(
      '[GitHub] No GitHub keys provided for Github app, docs feedback feature will not work.'
    );
    initError = new Error('Missing GitHub App credentials');
    return null;
  }

  try {
    const app = new App({
      appId,
      privateKey,
    });

    const { data } = await app.octokit.request(
      'GET /repos/{owner}/{repo}/installation',
      {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    instance = await app.getInstallationOctokit(data.id);
    return instance;
  } catch (error) {
    console.error('[GitHub] Failed to initialize GitHub App:', error);
    initError = error as Error;
    return null;
  }
}

interface RepositoryInfo {
  id: string;
  discussionCategories: {
    nodes: {
      id: string;
      name: string;
    }[];
  };
}

let cachedDestination: RepositoryInfo | undefined;
async function getFeedbackDestination(): Promise<RepositoryInfo | null> {
  if (cachedDestination) return cachedDestination;
  const octokit = await getOctokit();
  if (!octokit) return null;

  const {
    repository,
  }: {
    repository: RepositoryInfo;
  } = await octokit.graphql(`
  query {
    repository(owner: "${owner}", name: "${repo}") {
      id
      discussionCategories(first: 25) {
        nodes { id name }
      }
    }
  }
`);

  return (cachedDestination = repository);
}


