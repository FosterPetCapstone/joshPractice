import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { Link, NavigationContainer, useNavigation } from '@react-navigation/native';
import { linkTo, navigate } from 'expo-router/build/global-state/routing';
import { Redirect } from 'expo-router';

import colors from '../../assets/colors';






export default function LoginScreen(navigation) {

    // const navigation= useNavigation();

  return (
    <View style={styles.container}>
      <Image style={styles.loginBackground} source={require("../../assets/images/Dog-Cat.jpg")} />
      <View style={styles.content}>
        <Text style={styles.appname}>Foster Communicator and Pet Bio Generator</Text>
        <Text style={styles.tagline}>Let's get Barking!</Text>
        <Pressable 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Home')}
        >
            
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appname: {
    fontSize: 45,
    fontFamily: 'outfit-bold',
    textAlign: 'center',
    color: colors.black, // Ensuring the app name text is visible
    marginBottom: 525, // Add space between the app name and tagline
  },
  buttonText: {
    fontSize: 20,
    color: colors.white, // White text color for the button
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start', // Align content at the top of the screen
    alignItems: 'center', // Center content horizontally
    marginTop: 35, // Add some space between the top and the app name
    paddingHorizontal: 20, // Ensure text doesn’t touch edges
  },
  loginBackground: {
    position: 'absolute',
    width: '100%',
    opacity: 0.5,
    height: '100%',
    resizeMode: 'cover', // Ensures the background image covers the entire screen
  },
  loginButton: {
    padding: 14,
    backgroundColor: colors.PRIMARY, // Button color
    width: 200, // Fixed width for the button
    borderRadius: 14,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 30,
    // paddingTop: 500,
    textAlign: 'center',
    color: colors.black, // Make sure tagline is visible
    marginBottom: 20, // Add space between tagline and button
  },
  
  
});