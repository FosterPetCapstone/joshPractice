import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const NavigationDrawer = ({ slideAnim, closeMenu }) => (
  <Animated.View
    style={[
      styles.sidebar,
      { transform: [{ translateX: slideAnim }], zIndex: 3 }, // Ensure drawer is above content
    ]}
  >
    <TouchableOpacity style={styles.closeButton} onPress={closeMenu}>
      <Icon name="times" size={24} color="white" />
    </TouchableOpacity>
    <TouchableOpacity style={styles.menuItem}><Text style={styles.menuText}>🏠 Home</Text></TouchableOpacity>
    <TouchableOpacity style={styles.menuItem}><Text style={styles.menuText}>📜 Bios</Text></TouchableOpacity>
    <TouchableOpacity style={styles.menuItem}><Text style={styles.menuText}>👤 Profile</Text></TouchableOpacity>
  </Animated.View>
);

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: '100%',
    backgroundColor: '#333',
    paddingTop: 60,
    paddingHorizontal: 20,
    zIndex: 3, // Ensure drawer stays above content
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  menuText: {
    fontSize: 18,
    color: 'white',
  },
});

export default NavigationDrawer;
