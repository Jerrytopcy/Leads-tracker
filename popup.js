const saveCurrentSiteBtn = document.getElementById('saveCurrentSite');
const saveManualBtn = document.getElementById('saveManual');
const manualUrlInput = document.getElementById('manualUrl');
const savedLinks = document.getElementById('savedLinks');
const clearAllBtn = document.getElementById('clearAll');
const exportLinksBtn = document.getElementById('exportLinks');
const searchLinks = document.getElementById('searchLinks');
const navToggle = document.getElementById('navToggle');
const dropdownMenu = document.getElementById('dropdownMenu');
const deleteModal = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');
const actionModal = document.getElementById('actionModal');
const actionText = document.getElementById('actionText');
const confirmAction = document.getElementById('confirmAction');
const cancelAction = document.getElementById('cancelAction');

let deleteIndex = null; // Tracks the link to delete
let actionType = null; // Tracks the type of bulk action (clear/export)

// Toggle Navbar Dropdown
// Toggle dropdown menu when the icon button is clicked
navToggle.addEventListener('click', () => {
  dropdownMenu.classList.toggle('open'); // Show or hide the dropdown
  dropdownMenu.classList.toggle('hidden'); // Toggle between hidden and visible
});

// Close dropdown if clicked outside of it
document.addEventListener('click', (event) => {
  if (!dropdownMenu.contains(event.target) 
  && !navToggle.contains(event.target) 
  && !settingsPanel.contains(event.target) 
  && !actionModal.contains(event.target)  
  && !aboutPopup.contains(event.target) 
  && !moreInfoPopup.contains(event.target)) {
    dropdownMenu.classList.remove('open');
    dropdownMenu.classList.add('hidden');
  }
});

// Save Current Site
saveCurrentSiteBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) saveLink(tab.url);
});

// Save Manual Input
saveManualBtn.addEventListener('click', () => {
    
  const url = `http://${manualUrlInput.value.trim()}`;

  if (validateUrl(url)) {
    saveLink(url);
    manualUrlInput.value = '';
  } else {
    showNotification('Please enter a valid URL!', 'error');
  }
});

// Save Link Function
function saveLink(url) {
    if (!url) {
      showNotification('Please enter a valid URL!', 'error');
      return;
    }
  
    chrome.storage.local.get({ links: [] }, (result) => {
      const existingLinks = result.links.map((link) => link.url);
      if (existingLinks.includes(url)) {
        showNotification('This link is already saved!', 'warning');
        return;
      }
  
      const newLink = { url, date: new Date().toLocaleString() };
      const updatedLinks = [...result.links, newLink];
  
      chrome.storage.local.set({ links: updatedLinks }, () => {
        displayLinks();
        showNotification('Link saved successfully!', 'success');
      });
    });
  }
  
  

// Display Links
function getSiteName(url) {
  try {
    const { hostname } = new URL(url);
    const siteName = hostname.replace('www.', '').split('.')[0];
    return siteName.charAt(0).toUpperCase() + siteName.slice(1); // Capitalize the first letter
  } catch (error) {
    console.error('Error getting site name:', error);
    return 'Unknown Site'; // Fallback name if there’s an error
  }
}

async function getFaviconUrl(url) {
  try {
    const { hostname } = new URL(url); // Extract hostname
    const faviconUrl = `https://${hostname}/favicon.ico`;

    // Check if favicon exists
    const response = await fetch(faviconUrl, { method: 'HEAD' });
    return response.ok ? faviconUrl : 'icon.png'; // Use favicon if found, fallback otherwise
  } catch (error) {
    console.error('Error fetching favicon:', error);
    return 'icon.png'; // Fallback to default icon on error
  }
}



async function displayLinks() {
  chrome.storage.local.get({ links: [] }, async (result) => {
    const savedLinks = document.getElementById('savedLinks');
    const linksCount = document.getElementById('linksCount'); // Get the count display element
    savedLinks.innerHTML = ''; // Clear existing links

    if (result.links && result.links.length > 0) {
      linksCount.textContent = `Total Links: ${result.links.length}`; // Update the count
      for (const [index, link] of result.links.entries()) {
        const siteName = getSiteName(link.url); // Extract site name
        const faviconUrl = `https://${new URL(link.url).hostname}/favicon.ico`; // Favicon URL
        const truncatedUrl = link.url.length > 50 ? `${link.url.slice(0, 47)}...` : link.url;

        // Create list item for the saved link
        const li = document.createElement('li');
        li.className = 'link-item';
        li.innerHTML = `
          <div class="link-heading">
            <img src="${faviconUrl}" alt="favicon" class="favicon" />
            <h3 class="site-name">${siteName}</h3>
          </div>
          <a href="${link.url}" target="_blank" class="link-container">
            <span class="link-text" title="${link.url}">
              ${truncatedUrl}<br><small>${link.date}</small>
            </span>
          </a>
          <button class="delete-btn" data-index="${index}">Delete</button>
        `;

        const imgElement = li.querySelector('.favicon');

        // Handle favicon loading fallback
        imgElement.addEventListener('error', () => {
          // If favicon fails to load, replace with default after a slight delay
          setTimeout(() => {
            imgElement.src = 'icon.png'; // Default icon
          }, 500); // 500ms delay for fallback
        });

        savedLinks.appendChild(li);
      }

      // Attach event listeners to delete buttons
      const deleteButtons = document.querySelectorAll('.delete-btn');
      deleteButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation(); // Prevent link click
          const index = event.target.getAttribute('data-index');
          confirmDeletion(index);
        });
      });
    } else {
      // Display message if no links are saved
      linksCount.textContent = `Total Links: 0`; // Update count to 0 if no links
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent =
        'No links saved yet. Click on the SAVE SITE button or enter your favourite website name and click on SAVE URL button to get started!';
      savedLinks.appendChild(emptyMessage);
    }
  });
}



 
// Confirm Deletion Popup
function confirmDeletion(index) {
  deleteIndex = index;
  deleteModal.classList.remove('hidden');
}

// Handle Delete Confirmation
confirmDelete.addEventListener('click', () => {
  chrome.storage.local.get({ links: [] }, (result) => {
    const links = result.links;
    links.splice(deleteIndex, 1);
    chrome.storage.local.set({ links }, () => {
      displayLinks();
      deleteModal.classList.add('hidden');
      showNotification('Deleted!', '');
    });
  });
});

cancelDelete.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
});

// Clear All with Confirmation
clearAllBtn.addEventListener('click', () => {
  actionType = 'clear';
  actionText.innerText = 'Are you sure you want to clear all saved links?';
  actionModal.classList.remove('hidden');

});

// Export Links with Confirmation
exportLinksBtn.addEventListener('click', () => {
  actionType = 'export';
  actionText.innerText = 'Do you want to export all saved links?';
  actionModal.classList.remove('hidden');
});

// Handle Bulk Action Confirmation
confirmAction.addEventListener('click', () => {
  chrome.storage.local.get({ links: [] }, (result) => {
    const links = result.links;
    if (actionType === 'clear') {
      if (links.length === 0) {
        showNotification('links Already Cleared.');
        actionModal.classList.add('hidden');
      }else{
        chrome.storage.local.set({ links: [] }, () => {
          displayLinks();
          showNotification('All links Cleared.');
          actionModal.classList.add('hidden');
        });

      }
    } else if (actionType === 'export') {
      if (links.length === 0) {
        showNotification('No links to export.');
      } else {
        exportLinks(links);
        showNotification('Links exported successfully');
      }
      actionModal.classList.add('hidden');
    }
  });
});

// Cancel Bulk Action
cancelAction.addEventListener('click', () => {
  actionModal.classList.add('hidden');
});

// Export Links Function
function exportLinks(links) {
  const blob = new Blob(
    links.map((link) => `${link.url} (Saved on: ${link.date})\n`),
    { type: 'text/plain' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Leadstracker.jtc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// URL Validation
function validateUrl(url) {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' +
    '(([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}' +
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
    '(\\?[;&a-z\\d%_.~+=-]*)?' +
    '(\\#[-a-z\\d_]*)?$',
    'i'
  );
  return !!pattern.test(url);
}

// Get reference to the Import Links button and hidden file input
const importLinksBtn = document.getElementById('importLinks');
const fileInput = document.getElementById('fileInput');
const importModal = document.getElementById('importModal');
const confirmImport = document.getElementById('confirmImport');
const cancelImport = document.getElementById('cancelImport');


let linksToImport = []; // Temporary storage for links to import

// Event listener for the Import Links button
importLinksBtn.addEventListener('click', () => {
  fileInput.click(); // Trigger the file input dialog
});

// Event listener for file selection
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const content = reader.result;
    linksToImport = parseLinksFromFile(content);

    if (linksToImport.length === 0) {
      showNotification('No valid links found in the file!', 'warning');
      resetFileInput(); // Reset the file input
      return;
    }

    // Show confirmation modal
    document.getElementById('importMessage').textContent = `Found ${linksToImport.length} links in your file. Do you want to continue with the import?`;
    importModal.classList.remove('hide');
  };

  reader.readAsText(file);
  resetFileInput(); // Reset the file input immediately after reading
});

// Confirm Import
confirmImport.addEventListener('click', () => {
  chrome.storage.local.get({ links: [] }, (result) => {
    const existingLinks = result.links.map((link) => link.url);
    const newLinks = linksToImport.filter((link) => !existingLinks.includes(link.url));

    if (newLinks.length === 0) {
      showNotification('No new links to import!', 'warning');
    } else {
      const updatedLinks = [...result.links, ...newLinks];
      chrome.storage.local.set({ links: updatedLinks }, () => {
        displayLinks();
        showNotification(`${newLinks.length} links imported successfully!`, 'success');
      });
    }

    // Close modal
    importModal.classList.add('hide');
    linksToImport = []; // Clear temporary storage
  });
});

// Cancel Import
cancelImport.addEventListener('click', () => {
  importModal.classList.add('hide');
  linksToImport = []; // Clear temporary storage
});

// Helper function to parse links from the file content
function parseLinksFromFile(content) {
  const lines = content.split('\n').filter((line) => line.trim() !== ''); // Split by new lines and ignore empty lines
  return lines.map((line) => {
    const urlMatch = line.match(/^(https?:\/\/[^\s]+)/); // Extract the URL part
    return urlMatch
      ? { url: urlMatch[0], date: 'Imported: ' + new Date().toLocaleString() }
      : null;
  }).filter(Boolean); // Remove null values (invalid lines)
}

// Helper function to reset the file input
function resetFileInput() {
  fileInput.value = ''; // Reset the file input value to allow re-selecting the same file
}

// Helper function to show notifications
function showNotification(message, type) {
  console.log(`[${type.toUpperCase()}]: ${message}`);
  // Replace this with your notification logic
}


// Initialize
document.addEventListener('DOMContentLoaded', displayLinks);

// Search Links
searchLinks.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  Array.from(savedLinks.children).forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query) ? 'flex' : 'none';
  });
});

// showNotification
function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');
  
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
  
    // Add to the notification area
    notificationArea.appendChild(notification);
  
    // Trigger sliding animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100); // Allow DOM insertion
  
    // Remove notification after timeout
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300); // Wait for slide-out animation
    }, 3000);
  }
  
  // Get references to popup elements
const aboutPopup = document.getElementById('aboutPopup');
const closePopup = document.getElementById('closePopup');
const popupMoreInfo = document.getElementById('popupMoreInfo');
const aboutUs =document.getElementById('aboutUs')
// Function to open popup
function showAboutPopup() {
  aboutPopup.classList.remove('hidden');
}

// Function to close popup
function hideAboutPopup() {
  aboutPopup.classList.add('hidden');
}

// Attach event listeners
closePopup.addEventListener('click', hideAboutPopup);
aboutPopup.addEventListener('click', (e) => {
  if (e.target === aboutPopup) hideAboutPopup();
});

// Example button to trigger popup
document.getElementById('aboutUs').addEventListener('click', showAboutPopup);

const moreInfoPopup = document.getElementById('moreInfoPopup');
const closeMoreInfo = document.getElementById('closeMoreInfo');
const closeMoreInfoFooter = document.getElementById('closeMoreInfoFooter');

popupMoreInfo.addEventListener('click', () => {
  moreInfoPopup.classList.remove('hidden');
});

closeMoreInfo.addEventListener('click', () => {
  moreInfoPopup.classList.add('hidden');
});

closeMoreInfoFooter.addEventListener('click', () => {
  moreInfoPopup.classList.add('hidden');
});

// Theme toggle
const toggleButton = document.getElementById("darkModeToggle");
const icon = toggleButton.querySelector(".material-icons");
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme"); // Get saved theme ('dark' or 'light')

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    icon.textContent = "light_mode"; // Change to light mode icon
  } else {
    document.body.classList.remove("dark-mode");
    icon.textContent = "dark_mode"; // Change to dark mode icon
  }
});
toggleButton.addEventListener("click", () => {
 
  document.body.classList.toggle("dark-mode");
  const themeEnabled = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", themeEnabled ? "dark" : "light"); // Save theme to localStorage


  // Change the icon dynamically
  if (document.body.classList.contains("dark-mode")) {
    icon.textContent = "light_mode"; // Change to light mode icon
    autoThemeToggle.textContent = "Manual (Dark)";
    autoThemeToggle.classList.remove("active");
  } else {
    icon.textContent = "dark_mode"; // Change to dark mode icon
    autoThemeToggle.textContent = "Manual (Light)";
    autoThemeToggle.classList.remove("active");
  }

  
});

// Settings
const settingsButton = document.getElementById("settings");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const autoThemeToggle = document.getElementById("autoThemeToggle");

// Implementation the functionality to handle time customization in settings
const autoThemeDetails = document.getElementById("autoThemeDetails");
const editThemeSchedule = document.getElementById("editThemeSchedule");
const themeSettingsModal = document.getElementById("themeSettingsModal");
const closeModal = document.getElementById("closeModal");
const saveThemeSchedule = document.getElementById("saveThemeSchedule");
const nightStartInput = document.getElementById("nightStart");
const nightEndInput = document.getElementById("nightEnd");

// Function to check the current time and set the theme
function applyThemeBasedOnTime() {
  // Retrieve the user-defined start and end times from localStorage
  const nightStart = localStorage.getItem("nightStart") || "18:00"; // Default to 6:00 PM
  const nightEnd = localStorage.getItem("nightEnd") || "06:00"; // Default to 6:00 AM


  
  // Get the current time in HH:MM format
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  // Check if the current time falls within the "night" range
  const isNight = checkIfNight(currentTime, nightStart, nightEnd);

  if (isNight) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("theme", "auto-night");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "auto-day");
  }

 
}

// Helper function to check if the current time is in the "night" range
function checkIfNight(currentTime, nightStart, nightEnd) {
  // Convert times to Date objects for easy comparison
  const [currentHours, currentMinutes] = currentTime.split(":").map(Number);
  const [startHours, startMinutes] = nightStart.split(":").map(Number);
  const [endHours, endMinutes] = nightEnd.split(":").map(Number);

  const currentDateTime = new Date(0, 0, 0, currentHours, currentMinutes);
  const startDateTime = new Date(0, 0, 0, startHours, startMinutes);
  const endDateTime = new Date(0, 0, 0, endHours, endMinutes);

  if (startDateTime < endDateTime) {
    // Night spans the same day (e.g., 18:00 to 23:59)
    return currentDateTime >= startDateTime && currentDateTime <= endDateTime;
  } else {
    // Night spans two days (e.g., 18:00 to 06:00)
    return currentDateTime >= startDateTime || currentDateTime <= endDateTime;
  }
  
}


// Load saved settings on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "auto-night" || savedTheme === "auto-day") {
    // Apply auto theme logic
    applyThemeBasedOnTime();
    autoThemeToggle.textContent = "Auto (Enabled)";
    autoThemeToggle.classList.add("active");
  } else if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    autoThemeToggle.textContent = "Manual (Dark)";
    autoThemeToggle.classList.remove("active");
  } else {
    document.body.classList.remove("dark-mode");
    autoThemeToggle.textContent = "Manual (Light)";
    autoThemeToggle.classList.remove("active");
  }
});

// Open Settings Panel
settingsButton.addEventListener("click", () => {
  settingsPanel.classList.remove("hidden");
});

// Close Settings Panel
closeSettings.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

// Toggle Automatic Theme Setting
autoThemeToggle.addEventListener("click", () => {
  const isAutoEnabled = localStorage.getItem("theme")?.startsWith("auto");

  if (isAutoEnabled) {
    // Disable auto theme
    localStorage.setItem("theme", "light");
    document.body.classList.remove("dark-mode");
    autoThemeToggle.textContent = "Manual (Light)";
    autoThemeToggle.classList.remove("active");
  } else {
    // Enable auto theme
    applyThemeBasedOnTime(); // Apply the current time-based theme immediately
    autoThemeToggle.textContent = "Auto (Enabled)";
    autoThemeToggle.classList.add("active");
  }
});

// Periodically check and apply the theme (every minute)
setInterval(() => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme?.startsWith("auto")) {
    applyThemeBasedOnTime();
  }
}, 60000); // 60,000 ms = 1 minute




// Open the modal
editThemeSchedule.addEventListener("click", () => {
  themeSettingsModal.classList.remove("hidden");
});

// Close the modal
closeModal.addEventListener("click", () => {
  themeSettingsModal.classList.add("hidden");
});

// Save the custom schedule
saveThemeSchedule.addEventListener("click", () => {
  const nightStart = nightStartInput.value; // Format: HH:MM
  const nightEnd = nightEndInput.value;

  // Save the schedule to localStorage
  localStorage.setItem("nightStart", nightStart);
  localStorage.setItem("nightEnd", nightEnd);

  // Update the tooltip
  autoThemeDetails.title = `Night mode starts at ${formatTime(nightStart)} and ends at ${formatTime(nightEnd)}`;

  // Close the modal
  themeSettingsModal.classList.add("hidden");
});

// Load saved times on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedNightStart = localStorage.getItem("nightStart") || "18:00";
  const savedNightEnd = localStorage.getItem("nightEnd") || "06:00";

  nightStartInput.value = savedNightStart;
  nightEndInput.value = savedNightEnd;

  autoThemeDetails.title = `Night mode starts at ${formatTime(savedNightStart)} and ends at ${formatTime(savedNightEnd)}`;
});

// Helper function to format time (e.g., "18:00" to "6:00 PM")
function formatTime(time24) {
  const [hour, minute] = time24.split(":").map(Number);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
}
// Update the clock every second
function updateClock() {
  const clockElement = document.getElementById('clock');
  const now = new Date();
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  clockElement.textContent = `${formattedTime}`;
}

// Call updateClock every second
setInterval(updateClock, 1000);