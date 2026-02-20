import React from 'react';

interface PreviewModalProps {
    isOpen: boolean;
    imageSrc: string | null;
    onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, imageSrc, onClose }) => {
    if (!isOpen || !imageSrc) return null;

    const isPdf = imageSrc.startsWith('data:application/pdf');
    const isText = imageSrc.startsWith('data:text/plain');

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-black rounded-2xl overflow-hidden relative shadow-2xl h-[80vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-md"
                >
                    <span className="material-symbols-rounded">close</span>
                </button>
                {isPdf ? (
                    <iframe
                        src={imageSrc}
                        className="w-full h-full bg-white"
                        title="Document Preview"
                    />
                ) : isText ? (
                    <div className="w-full h-full bg-white text-gray-800 p-6 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {decodeURIComponent(escape(window.atob(imageSrc.split(',')[1] || '')))}
                    </div>
                ) : (
                    <img
                        src={imageSrc}
                        alt="Preview"
                        className="w-full h-full object-contain"
                    />
                )}
            </div>
        </div>
    );
};
