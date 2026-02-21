import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-950 border-t border-arrow-deepGreen/30 mt-auto py-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex flex-col justify-center items-center gap-4 mb-8">
            <img 
               src="https://i.imgur.com/ofuT9Pm.png" 
               alt="Arrow Delivery Logo" 
               className="h-24 w-auto opacity-100 hover:scale-105 transition-all duration-500 drop-shadow-[0_0_12px_rgba(47,191,142,0.4)]"
             />
        </div>
        <p className="text-arrow-gray text-sm">
          &copy; {new Date().getFullYear()} Arrow Delivery. Precision in every package.
        </p>
      </div>
    </footer>
  );
};

export default Footer;