import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  companyInfo: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  companyDetails: {
    fontSize: 10,
    marginBottom: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  orderInfo: {
    marginBottom: 20,
  },
  orderInfoItem: {
    fontSize: 12,
    marginBottom: 5,
  },
  lineItem: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  lineItemHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lineItemDetails: {
    fontSize: 10,
    marginBottom: 3,
  },
  sizingMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginBottom: 5,
  },
  sizeCell: {
    width: '33%',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: 4,
    fontSize: 8,
    textAlign: 'left',
    marginBottom: 2,
  },
  sizeHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 2,
  },
  summary: {
    marginTop: 20,
    borderTop: 1,
    paddingTop: 10,
  },
});

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

const OrderPDF = ({ lineItems, totalGarmentQuantity, totalCapQuantity, totalPrice, customerName, orderDate, orderNumber }) => {
  const subtotal = totalPrice || 0;
  const salesTax = subtotal * 0.101; // 10.1% sales tax
  const total = subtotal + salesTax;

  const renderSizingMatrix = (item) => {
    const standardSizes = STANDARD_SIZES.filter(size => item.quantities[size] > 0);
    const otherSizes = Object.keys(item.quantities).filter(size => !STANDARD_SIZES.includes(size) && item.quantities[size] > 0);

    const renderSizeCell = (size) => {
      const quantity = item.quantities[size];
      const upcharge = item.productData?.sizeUpcharges?.[size] || 0;
      const price = item.price + upcharge;
      const subtotal = quantity * price;
      return (
        <View key={size} style={styles.sizeCell}>
          <Text>{size}: {quantity}</Text>
          <Text>${price.toFixed(2)} each</Text>
          <Text>Subtotal: ${subtotal.toFixed(2)}</Text>
          {upcharge > 0 && <Text>(+${upcharge.toFixed(2)} upcharge)</Text>}
        </View>
      );
    };

    return (
      <View>
        {standardSizes.length > 0 && (
          <View>
            <Text style={styles.sizeHeader}>Standard Sizes:</Text>
            <View style={styles.sizingMatrix}>
              {standardSizes.map(renderSizeCell)}
            </View>
          </View>
        )}
        {otherSizes.length > 0 && (
          <View>
            <Text style={styles.sizeHeader}>Other Sizes:</Text>
            <View style={styles.sizingMatrix}>
              {otherSizes.map(renderSizeCell)}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>Northwest Custom Apparel</Text>
            <Text style={styles.companyDetails}>2025 Freeman Road East, Milton, WA 98354</Text>
            <Text style={styles.companyDetails}>Phone: 253-922-5793</Text>
            <Text style={styles.companyDetails}>Website: www.nwcustomapparel.com</Text>
          </View>
        </View>

        <Text style={styles.title}>Invoice</Text>

        <View style={styles.orderInfo}>
          <Text style={styles.orderInfoItem}>Customer Name: {customerName}</Text>
          <Text style={styles.orderInfoItem}>Order Date: {orderDate}</Text>
          <Text style={styles.orderInfoItem}>Order Number: {orderNumber}</Text>
        </View>
        
        {lineItems.map((item, index) => (
          <View key={index} style={styles.lineItem}>
            <Text style={styles.lineItemHeader}>{item.productTitle}</Text>
            <Text style={styles.lineItemDetails}>Style: {item.styleNo}</Text>
            <Text style={styles.lineItemDetails}>Color: {item.colorName}</Text>
            
            {renderSizingMatrix(item)}
            
            <Text style={styles.lineItemDetails}>Total Quantity: {item.totalQuantity}</Text>
            <Text style={styles.lineItemDetails}>Subtotal: ${item.subtotal.toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <Text>Total Garment Quantity: {totalGarmentQuantity}</Text>
          <Text>Total Cap Quantity: {totalCapQuantity}</Text>
          <Text>Subtotal: ${subtotal.toFixed(2)}</Text>
          <Text>Sales Tax (10.1%): ${salesTax.toFixed(2)}</Text>
          <Text style={{ fontWeight: 'bold' }}>Total: ${total.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default OrderPDF;