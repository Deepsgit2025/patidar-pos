import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadAsync = async (key, defaultValue) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return JSON.parse(value);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error loading key ${key}:`, error);
    return defaultValue;
  }
};

export const saveAsync = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving key ${key}:`, error);
  }
};
