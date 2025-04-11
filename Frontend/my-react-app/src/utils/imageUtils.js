// Frontend/my-react-app/src/utils/imageUtils.js
export const getImageUrl = (imageUrlFromApi) => {
    const placeholder = '/placeholder-plant.png'; // Path relative to /public folder
    if (!imageUrlFromApi) {
        return placeholder;
    }
    // Assuming your API returns a full, valid URL (like http://127.0.0.1:8000/media/plant_images/...)
    // If it returns a relative path (like /media/plant_images/...), you might need to prepend the base URL
    // const baseUrl = 'http://127.0.0.1:8000'; // Only if needed
    // return imageUrlFromApi.startsWith('/') ? `${baseUrl}${imageUrlFromApi}` : imageUrlFromApi;
    return imageUrlFromApi; // Directly return if it's already a full URL
};