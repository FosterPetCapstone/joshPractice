import { View, Text } from 'react-native';
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Import all screens
import HomeScreen from './home';
import BiosScreen from './bios';
import ScheduleScreen from './schedule';
import ProfileScreen from './profile';

const Drawer = createDrawerNavigator();

const TabLayout = () => {
  return (
    <Drawer.Navigator initialRouteName="Home">
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Bios" component={BiosScreen} />
      <Drawer.Screen name="Schedule" component={ScheduleScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
};

export default TabLayout;