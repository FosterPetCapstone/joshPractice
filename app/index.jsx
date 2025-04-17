import { React } from 'react'
import {NavigationContainer} from '@react-navigation/native';
import  {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Tab = createBottomTabNavigator();

import LoginScreen from "./login/index";
import HomeScreen from "./(tabs)/home";
import BiosScreen from "./(tabs)/bios";
import ScheduleScreen from "./(tabs)/schedule";
import ProfileScreen from "./(tabs)/profile";
import NavLayout from "./(tabs)/_layout";
import { Stack } from 'expo-router';







export default function index() {


  // return <LoginScreen />
  // return <HomeScreen />
  return <BiosScreen />
  
  
  
}







