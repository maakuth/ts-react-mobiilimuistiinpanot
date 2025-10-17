import React from 'react';
import type { Note } from '../types';
import { LocationPinIcon, SparklesIcon, LoadingSpinner, ShareIcon } from './icons';

interface NoteCardProps {
  note: Note;
  onSummarize: (noteId: string) => void;
  onShare: (note: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onSummarize, onShare }) => {
  const formattedDate = new Date(note.timestamp).toLocaleString();
  const canShare = typeof navigator.share === 'function';

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col justify-between space-y-4 break-words">
      <div>
        <p className="text-gray-300 whitespace-pre-wrap">{note.text}</p>
        {note.summary && (
          <div className="mt-4 p-3 bg-gray-700/50 border-l-4 border-purple-400 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-5 h-5 text-purple-400" />
              <h4 className="font-bold text-purple-300">AI Summary</h4>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.summary}</p>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-700">
        <div className="flex items-center gap-2">
          {note.location && (
            <div className="flex items-center gap-1" title={`Lat: ${note.location.latitude}, Lon: ${note.location.longitude}`}>
              <LocationPinIcon className="w-4 h-4" />
              <span>{note.location.latitude.toFixed(2)}, {note.location.longitude.toFixed(2)}</span>
            </div>
          )}
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
            {canShare && (
                 <button
                    onClick={() => onShare(note)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-xs"
                    aria-label="Share note"
                >
                    <ShareIcon className="w-4 h-4" />
                    <span>Share</span>
                </button>
            )}
            {!note.summary && (
            <button
                onClick={() => onSummarize(note.id)}
                disabled={note.isSummarizing}
                className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed text-white rounded-md transition-colors text-xs"
            >
                {note.isSummarizing ? (
                <>
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Summarizing...</span>
                </>
                ) : (
                <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Summarize</span>
                </>
                )}
            </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default NoteCard;