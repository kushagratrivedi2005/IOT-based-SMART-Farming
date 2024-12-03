import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from datetime import timedelta
import json
import warnings
from statsmodels.tools.sm_exceptions import ConvergenceWarning

# Suppress specific warnings
warnings.filterwarnings('ignore', category=ConvergenceWarning)
warnings.filterwarnings('ignore', category=UserWarning)

# Load data
df = pd.read_csv('feed.csv')

# Convert created_at to datetime properly
df['created_at'] = df['created_at'].str.replace(':05+30', '+0530')
df['created_at'] = pd.to_datetime(df['created_at'], format='%Y-%m-%dT%H:%M:%S%z', errors='coerce')

# Set created_at as index and sort
df.set_index('created_at', inplace=True)
df.sort_index(inplace=True)

# Update deprecated resampling
df_resampled = df.resample('1min').mean()
df_resampled = df_resampled.ffill()  # Updated from deprecated fillna method

# Selecting fields to predict
fields_to_predict = ['field1', 'field2', 'field3', 'field4', 'field5', 'field6', 'field7']

# Dictionary to store predictions and accuracy metrics
predictions = {}
accuracy_metrics = {}

def get_arima_order(field_data, field_name):
    """
    Determine ARIMA order based on field characteristics and data stationarity
    """
    if field_name == 'field7':
        return (2, 1, 2)
    
    # Check for stationarity and adjust accordingly
    if np.std(field_data) < 0.1:  # Very stable data
        return (1, 0, 0)
    return (1, 1, 1)

def transform_data(data, field_name):
    """
    Transform data with proper handling of edge cases
    """
    if field_name == 'field7':
        # Handle zero and negative values properly
        min_val = data.min()
        if min_val <= 0:
            offset = abs(min_val) + 1
            return np.log1p(data + offset)
        return np.log1p(data)
    return data

def inverse_transform(predictions, field_name, original_data=None):
    """
    Inverse transform predictions with proper handling of transformations
    """
    if field_name == 'field7':
        transformed_preds = np.expm1(predictions)
        # Ensure predictions are within reasonable bounds
        if original_data is not None:
            max_val = original_data.max() * 1.5
            min_val = max(0, original_data.min())
            transformed_preds = np.clip(transformed_preds, min_val, max_val)
        return transformed_preds
    return predictions

def fit_arima_model(data, order, max_attempts=3):
    """
    Fit ARIMA model with multiple attempts and different configurations
    """
    for attempt in range(max_attempts):
        try:
            model = ARIMA(data, order=order)
            model_fit = model.fit()
            return model_fit
        except:
            # If fitting fails, try different order
            new_order = (max(1, order[0] - 1), order[1], max(1, order[2] - 1))
            order = new_order
    raise Exception("Failed to fit ARIMA model after multiple attempts")

# Iterate over each field
for field in fields_to_predict:
    if df_resampled[field].isna().all():
        print(f"Skipping {field} - all values are NaN")
        continue
        
    try:
        # Get field statistics for validation
        field_stats = df_resampled[field].describe()
        
        # Split data into train and test sets
        train_size = int(len(df_resampled) * 0.8)
        train = df_resampled[field][:train_size]
        
        # Transform the data
        transformed_train = transform_data(train, field)
        
        # Get appropriate ARIMA order
        arima_order = get_arima_order(transformed_train, field)
        
        # Fit ARIMA model with improved error handling
        try:
            model_fit = fit_arima_model(transformed_train, arima_order)
        except Exception as e:
            print(f"Could not fit ARIMA model for {field}: {str(e)}")
            continue

        # Make predictions
        forecast = model_fit.forecast(steps=1440)
        
        # Inverse transform and validate predictions
        forecast = inverse_transform(forecast, field, train)
        
        # Apply constraints and smoothing
        forecast = pd.Series(forecast)
        forecast = forecast.clip(lower=0)  # Ensure non-negative values
        
        if field == 'field7':
            # Additional smoothing for field7
            forecast = forecast.rolling(window=5, min_periods=1, center=True).mean()
        
        predictions[field] = forecast.tolist()

    except Exception as e:
        print(f"Error processing {field}: {str(e)}")
        continue

# Prepare interval predictions
interval_predictions = {}
last_time = df_resampled.index[-1]

for field, forecast in predictions.items():
    interval_predictions[field] = []
    for hour in range(0, 24, 6):
        minute_index = hour * 60
        future_time = last_time + timedelta(hours=hour)
        if minute_index < len(forecast):
            value = forecast[minute_index]
            value = round(value if field != 'field7' else max(0, value), 2)
            
            interval_predictions[field].append({
                'Time': future_time.isoformat(),
                'Value': value
            })

# Add metadata
output = {
    'predictions': interval_predictions,
    'metadata': {
        'last_update': last_time.isoformat(),
        'model_type': 'ARIMA',
        'fields_processed': list(predictions.keys()),
        'model_parameters': {
            'training_size': train_size,
            'forecast_steps': 1440
        }
    }
}

# Save predictions
with open('interval_predictions.json', 'w') as json_file:
    json.dump(output, json_file, indent=4)

print("6-hour interval predictions saved to interval_predictions.json")