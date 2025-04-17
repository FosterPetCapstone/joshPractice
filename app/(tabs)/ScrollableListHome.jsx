import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const ScrollableListHome = ({ title, data }) => (
  <View style={styles.listContainerHome}>
    <Text style={styles.header}>{title}</Text>
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      )}
      style={styles.flatList}
      contentContainerStyle={styles.flatListContent}
    />
  </View>
);

const styles = StyleSheet.create({
  listContainerHome: {
    width: '90%',
    height: 250,
    borderWidth: 3,
    borderColor: 'gold',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9534f',
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: 'gold',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 10,
  },
  item: {
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: 'gray',
  },
});

export default ScrollableListHome;
