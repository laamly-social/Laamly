import { useState } from "react";
import { ChevronLeft } from "lucide-react";

interface Episode {
  title: string;
  pubDate: string;
  description: string;
  audioUrl: string;
  imageUrl?: string;
}

interface PodcastInfo {
  title: string;
  author: string;
  coverImage?: string;
}

interface PodcastFeed {
  id: string;
  name: string;
  description: string;
  url: string;
  category?: string;
}

const AVAILABLE_PODCASTS: PodcastFeed[] = [
  {
    id: 'twil',
    name: 'This Week in Linux',
    description: 'The latest news and updates from the Linux and Open Source world',
    url: 'https://thisweekinlinux.com/rss',
    category: 'Technology'
  },
  {
    id: 'destination-linux',
    name: 'Destination Linux',
    description: 'Weekly podcast covering Linux news and community discussions',
    url: 'https://destinationlinux.net/rss',
    category: 'Technology'
  },
  {
    id: 'npr-up-first',
    name: 'NPR Politics Podcast',
    description: 'NPR\'s morning news podcast with the three biggest stories of the day',
    url: 'https://feeds.npr.org/510310/podcast.xml',
    category: 'News'
  },
  {
    id: 'tle-news',
    name: 'The Linux Experiment News',
    description: 'Weekly Linux and open source news podcast',
    url: 'https://podcast.thelinuxexp.com/@tlenewspodcast/feed.xml',
    category: 'Technology'
  },
  {
   id: 'trh',
   name: "Techmeme Ride Home",
   description: "The daily tech news podcast",
     url: "https://feeds.megaphone.fm/ridehome",
   category: "Technology"
  }
];

export default function Podcasts() {
  const [showPodcastList, setShowPodcastList] = useState(true);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [podcastInfo, setPodcastInfo] = useState<PodcastInfo>({
    title: "Podcast RSS Player",
    author: "Unknown Author"
  });
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);

  const loadPodcast = (podcast: PodcastFeed) => {
    setSelectedPodcast(podcast);
    setShowPodcastList(false);
    setLoading(true);
    setError(false);
    setEpisodes([]);
    setActiveEpisodeIndex(null);
    setCurrentEpisode(null);
    fetchPodcast(podcast.url);
  };

  const backToPodcastList = () => {
    setShowPodcastList(true);
    setSelectedPodcast(null);
    setEpisodes([]);
    setActiveEpisodeIndex(null);
    setCurrentEpisode(null);
  };

  const fetchPodcast = async (rssUrl: string) => {
    const PROXY_URL = `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`;
    try {
      const response = await fetch(PROXY_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");

      // Check for parsing errors
      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error('Failed to parse XML feed.');
      }

      parsePodcastInfo(xmlDoc);
      const parsedEpisodes = parseEpisodes(xmlDoc);
      setEpisodes(parsedEpisodes);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching or parsing RSS feed:", err);
      setError(true);
      setLoading(false);
    }
  };

  const parsePodcastInfo = (xmlDoc: Document) => {
    const title = xmlDoc.querySelector('channel > title')?.textContent || 'Podcast Feed';
    const author = xmlDoc.querySelector('channel > itunes\\:author, channel > author')?.textContent || 'Unknown Author';
    const podcastImage = xmlDoc.querySelector('channel > image > url')?.textContent ||
                         xmlDoc.querySelector('channel > itunes\\:image')?.getAttribute('href');

    setPodcastInfo({
      title,
      author,
      coverImage: podcastImage || undefined
    });
  };

  const parseEpisodes = (xmlDoc: Document): Episode[] => {
    const items = xmlDoc.querySelectorAll('item');
    return Array.from(items).map(item => {
      const description = item.querySelector('description')?.textContent || '';
      const cleanDescription = description.replace(/<[^>]*>?/gm, ''); // Remove HTML tags

      return {
        title: item.querySelector('title')?.textContent || 'No Title',
        pubDate: item.querySelector('pubDate')?.textContent || '',
        description: cleanDescription,
        audioUrl: item.querySelector('enclosure')?.getAttribute('url') || '',
        imageUrl: item.querySelector('itunes\\:image')?.getAttribute('href') ||
                  xmlDoc.querySelector('channel > itunes\\:image')?.getAttribute('href') || undefined
      };
    });
  };

  const playEpisode = (index: number) => {
    const episode = episodes[index];
    if (!episode || !episode.audioUrl) {
      console.error("Episode or audio URL not found for index:", index);
      return;
    }

    setActiveEpisodeIndex(index);
    setCurrentEpisode(episode);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="text-center py-10">
          <svg className="animate-spin h-8 w-8 text-accent dark:text-accent-dark mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sub dark:text-sub-dark">Fetching Episodes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {!showPodcastList && (
          <button
            onClick={backToPodcastList}
            className="mb-4 flex items-center gap-2 text-accent dark:text-accent-dark hover:underline"
          >
            <ChevronLeft size={20} />
            Back to Podcasts
          </button>
        )}
        <div className="text-center bg-red-900/50 border border-red-500 p-4 rounded-lg">
          <h3 className="font-bold text-lg text-text dark:text-text-dark">Failed to Load Podcast Feed</h3>
          <p className="text-sub dark:text-sub-dark">Could not fetch the RSS feed. The server might be down or there could be a network issue. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Podcast Selection View
  if (showPodcastList) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-text dark:text-text-dark mb-2">Podcasts</h1>
          <p className="text-lg text-sub dark:text-sub-dark">Choose a podcast to listen to</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_PODCASTS.map((podcast) => (
            <div
              key={podcast.id}
              onClick={() => loadPodcast(podcast)}
              className="bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-xl p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 hover:border-accent dark:hover:border-accent-dark"
            >
              <div className="flex flex-col h-full">
                {podcast.category && (
                  <span className="text-xs font-semibold text-accent dark:text-accent-dark mb-2 uppercase tracking-wider">
                    {podcast.category}
                  </span>
                )}
                <h3 className="text-xl font-bold text-text dark:text-text-dark mb-3">
                  {podcast.name}
                </h3>
                <p className="text-sm text-sub dark:text-sub-dark flex-grow">
                  {podcast.description}
                </p>
                <button className="mt-4 w-full py-2 px-4 bg-accent dark:bg-accent-dark text-white rounded-lg hover:opacity-90 transition-opacity">
                  Listen Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Podcast Player View
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl pb-24 md:pb-8">
      {/* Back Button */}
      <button
        onClick={backToPodcastList}
        className="mb-4 flex items-center gap-2 text-accent dark:text-accent-dark hover:underline transition-all"
      >
        <ChevronLeft size={20} />
        Back to Podcasts
      </button>

      {/* Header */}
      <header className="mb-8 text-center md:text-left">
        <h1 className="text-4xl font-bold text-text dark:text-text-dark">{podcastInfo.title}</h1>
        <p className="text-lg text-sub dark:text-sub-dark">By {podcastInfo.author}</p>
        {selectedPodcast && (
          <p className="text-sm text-sub dark:text-sub-dark mt-1 italic">
            Listening to {selectedPodcast.name}
          </p>
        )}
      </header>

      {/* Main Content */}
      <main className="md:grid md:grid-cols-12 md:gap-8">
        {/* Episode List */}
        <div className="md:col-span-5 lg:col-span-4 h-[50vh] md:h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-3">
            {episodes.map((episode, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  activeEpisodeIndex === index
                    ? 'bg-accent dark:bg-accent-dark text-white'
                    : 'bg-panel dark:bg-panel-dark hover:bg-accent/70 dark:hover:bg-accent-dark/70'
                }`}
                onClick={() => playEpisode(index)}
              >
                <h3 className={`font-semibold ${
                  activeEpisodeIndex === index
                    ? 'text-white'
                    : 'text-text dark:text-text-dark'
                }`}>
                  {episode.title}
                </h3>
                <p className={`text-sm ${
                  activeEpisodeIndex === index
                    ? 'text-gray-200'
                    : 'text-sub dark:text-sub-dark'
                }`}>
                  {formatDate(episode.pubDate)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Player Section */}
        <div className="md:col-span-7 lg:col-span-8 md:sticky top-8 self-start mt-6 md:mt-0">
          <div className="bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-2xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.28)] transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <img
                src={
                  currentEpisode?.imageUrl ||
                  podcastInfo.coverImage ||
                  'https://placehold.co/600x600/1f2937/4b5563?text=Select+an+Episode'
                }
                alt="Podcast Artwork"
                className="w-48 h-48 md:w-64 md:h-64 rounded-xl object-cover mb-6 shadow-lg"
              />
              <h2 className="text-2xl font-bold mb-2 text-text dark:text-text-dark">
                {currentEpisode?.title || 'Select an episode to play'}
              </h2>
              <p className="text-sm text-sub dark:text-sub-dark mb-4">
                {currentEpisode ? formatDate(currentEpisode.pubDate) : '\u00A0'}
              </p>

              {currentEpisode && (
                <audio
                  key={currentEpisode.audioUrl}
                  controls
                  autoPlay
                  className="w-full rounded-lg mb-4"
                  src={currentEpisode.audioUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              )}

              <div className="text-left text-text dark:text-text-dark mt-6 max-h-48 overflow-y-auto w-full text-sm custom-scrollbar">
                <p>{currentEpisode?.description || 'The description of the selected episode will appear here.'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-muted);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-muted-dark);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border-dark);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-sub);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-sub-dark);
        }
      `}</style>
    </div>
  );
}
