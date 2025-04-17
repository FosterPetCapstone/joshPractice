import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import ScrollableList from './ScrollableListHome';
import NavigationDrawer from './NavigationDrawer';

const attentionNeededData = [
  { id: '1', name: 'Item One', description: 'This is the first item.' },
  { id: '2', name: 'Item Two', description: 'Here is some more text.' },
  { id: '3', name: 'Item Three', description: 'Another placeholder entry.' },
  { id: '4', name: 'Item Four', description: 'Just testing the list layout.' },
  { id: '5', name: 'Item Five', description: 'Last example item for now.' },
  { id: '6', name: 'Item Six', description: 'Adding more content to test scroll.' },
  { id: '7', name: 'Item Seven', description: 'Ensuring list scrolls properly.' }
];

const scheduledCallsData = [
  { id: '1', name: 'Item One', description: 'This is the first item.' },
  { id: '2', name: 'Item Two', description: 'Here is some more text.' },
  { id: '3', name: 'Item Three', description: 'Another placeholder entry.' },
  { id: '4', name: 'Item Four', description: 'Just testing the list layout.' },
  { id: '5', name: 'Item Five', description: 'Last example item for now.' },
  { id: '6', name: 'Item Six', description: 'Adding more content to test scroll.' },
  { id: '7', name: 'Item Seven', description: 'Ensuring list scrolls properly.' }
];

const home = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-250)).current; // Keeps animation state

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuOpen ? 0 : -250, // Slide in/out
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [menuOpen]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Drawer */}
      <NavigationDrawer slideAnim={slideAnim} closeMenu={() => setMenuOpen(false)} />

      {/* Clickable Background to Close Sidebar */}
      {menuOpen && <TouchableOpacity style={styles.overlay} onPress={() => setMenuOpen(false)} />}

      {/* Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => setMenuOpen(true)}>
          <Icon name="bars" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Home</Text>
        <TouchableOpacity>
          <Icon name="user" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ScrollableList title="⚠️ Attention Needed" data={attentionNeededData} />
        <ScrollableList title="📅 Scheduled Calls" data={scheduledCallsData} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  listContainerHome: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
    zIndex: 1, // Lower zIndex than navbar and sidebar
  },
  navBar: {
    width: '100%',
    height: 60,
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2, // Set zIndex to make navbar above other content
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
    zIndex: 1, // Lower zIndex than navbar and sidebar
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1, // Overlay behind navbar but on top of content
  },
});

export default home;
