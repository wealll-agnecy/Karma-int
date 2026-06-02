import React from 'react';
import { FaSearch } from 'react-icons/fa';
import '../../css/PremiumSearchBar.css';

const PremiumSearchBar = ({ value, onChange, style, className, ...props }) => {
    return (
        <div 
            className={`premium-search-container ${className || ''}`} 
            style={style}
        >
            <div className="premium-search-inner">
                <div className="premium-search-icon">
                    <FaSearch />
                </div>
                <input
                    type="text"
                    className="premium-search-input"
                    value={value}
                    onChange={onChange}
                    {...props}
                />
            </div>
        </div>
    );
};

export default PremiumSearchBar;
