// Load the Arabian Sea boundary from a Fusion Table or an uploaded shapefile
// Adjust the path to point to your own shapefile location
var arabianSea = ee.FeatureCollection("users/your_username/Arabian_Sea");

// Define the time range for analysis
var startYear = 2003;
var endYear = 2021; // Updated the end year to 2021

// Create a list of years for the time range
var years = ee.List.sequence(startYear, endYear);

// Define a list of month names for reference
var monthNames = ee.List(['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']);

// Accessing the MODIS Aqua satellite SST data product
var modisSST = ee.ImageCollection('NASA/OCEANDATA/MODIS-Aqua/L3SMI')
                .select('sst') // Selecting the 'sst' band for Sea Surface Temperature
                .filterBounds(arabianSea); // Focusing the analysis on the Arabian Sea

// Function to calculate monthly mean SST for each year
var calculateMonthlyMean = function(year) {
  return ee.List.sequence(1, 12).map(function(month) {
    // Filter the collection by year and month
    var filteredCollection = modisSST
      .filter(ee.Filter.calendarRange(year, year, 'year'))
      .filter(ee.Filter.calendarRange(month, month, 'month'));
    var meanImage = filteredCollection.mean(); // Calculate the mean SST for the month

    // Handling cases where 'sst' band might not be present
    var sstValue = ee.Algorithms.If(
      ee.Algorithms.IsEqual(meanImage.bandNames().contains('sst'), true),
      meanImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: arabianSea.geometry(),
        scale: 1000, // Scale set based on MODIS resolution and specific analysis needs
        bestEffort: true // Adjust computation scale if too many pixels are involved
      }),
      ee.Dictionary({'sst': null}) // Return null if 'sst' band is not present
    );
    
    // Formatting the date string for each entry
    var monthStr = ee.String(monthNames.get(ee.Number(month).subtract(1)));
    var dateStr = monthStr.cat(' ').cat(ee.String(ee.Number(year).format()));

    // Returning the formatted feature
    return ee.Feature(null, {
      'date': dateStr,
      'mean_sst': ee.Dictionary(sstValue).get('sst')
    });
  });
};

// Compile the data into a single feature collection
var sstCollection = ee.FeatureCollection(years.map(calculateMonthlyMean).flatten());

// Export the data as a CSV file for further analysis
Export.table.toDrive({
  collection: sstCollection,
  description: 'Arabian_Sea_Monthly_SST',
  selectors: ['date', 'mean_sst'], // Selecting the 'date' and 'mean_sst' properties for export
  fileFormat: 'CSV'
});
