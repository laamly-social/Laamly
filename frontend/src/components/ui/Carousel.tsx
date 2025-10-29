// @ts-nocheck

import { useState } from 'react';

const Carousel = ({ urls }) => {
   const [current, setCurrent] = useState(0);

   if (!urls || urls.length === 0) {
      return null; // Don't render anything if there are no images/videos
   }

   const handlePrev = () => {
      // Go to the previous slide, wrapping around if at the start
      setCurrent((prevCurrent) => (prevCurrent - 1 + urls.length) % urls.length);
   };

   const handleNext = () => {
      // Go to the next slide, wrapping around if at the end
      setCurrent((prevCurrent) => (prevCurrent + 1) % urls.length);
   };

   const renderMedia = (url) => {
      const videoMatch = url.match(/\.(mp4|webm|ogg)$/i);
      if (videoMatch) {
         const extension = videoMatch[1].toLowerCase();
         let videoMimeType = "";
         switch (extension) {
            case "mp4":
               videoMimeType = "video/mp4";
               break;
            case "webm":
               videoMimeType = "video/webm";
               break;
            case "ogg":
               videoMimeType = "video/ogg";
               break;
            default:
               break;
         }
         return (
            <video className="relative max-w-full max-h-full z-10 shadow" controls style={{ background: '#000', width: '100%', height: '100%', objectFit: 'contain' }}>
               <source src={`${url}/raw`} type={videoMimeType} />
            </video>
         );
      } else {
         return (
            <>
               <img className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110 z-0 opacity-75 dark:opacity-25" src={url} alt="blurred background" />
               <img className="relative max-w-full h-full max-h-full z-10 shadow" src={url} alt="media content" />
            </>
         );
      }
   };

   return (
      <div className="my-2 rounded-xl overflow-hidden relative">
         {/* This div holds all the slides and moves left/right based on the `current` state */}
         <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
         >
            {urls.map((url, index) => (
               <div key={index} className="w-full rounded-xl flex-shrink-0 flex justify-center items-center h-[280px] sm:h-[350px] md:h-[400px] relative overflow-hidden">
                  {renderMedia(url)}
               </div>
            ))}
         </div>

         {/* Conditionally render buttons only if there is more than one item */}
         {urls.length > 1 && (
            <>
               <button
                  type="button"
                  onClick={handlePrev}
                  className="carousel-prev absolute left-2 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full p-2 shadow shadow-neutral-800 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  aria-label="Previous image"
               >
                  &#8592;
               </button>
               <button
                  type="button"
                  onClick={handleNext}
                  className="carousel-next absolute right-2 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full p-2 shadow shadow-neutral-800 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  aria-label="Next image"
               >
                  &#8594;
               </button>
            </>
         )}
      </div>
   );
};

export default Carousel;